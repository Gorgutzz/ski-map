import React, { Component } from "react";
import axios from "axios";
import InputRange from "react-input-range";
import SkiMap from "./components/SkiMap";
import {
  shouldShowResort,
  getTotal,
  getPointForResort,
} from "./components/utils/AppUtils";
import { numberFormat } from './components/utils/Format';
import "leaflet/dist/leaflet.css";
import "react-input-range/lib/css/index.css";
import firebase from "./firebase/firebase.js";
import { DebounceInput } from "react-debounce-input";
import debounce from 'lodash/debounce'

class App extends Component {
  state = {
    searchTerm: "",
    resorts: [],
    filteredResorts: [],
    verticalFilter: { min: 0, max: 0 },
    maxVertical: 100,
    passFilter: "all",
    verticalUnits: "metric",
  };

  async componentDidMount() {
    // trigger data load from openskimap
    axios
      .get(`//tiles.skimap.org/geojson/ski_areas.geojson`)
      .then((res) => {
        const resorts =
          res.data.features.map((resort) => ({
            id: resort.properties.id,
            point: getPointForResort(resort),
            name: resort.properties.name,
            website: resort.properties.website,
            lifts: getTotal(resort.properties.statistics.lifts.byType, "count"),
            runs: resort.properties.statistics.runs.byActivity.downhill
              ? getTotal(
                  resort.properties.statistics.runs.byActivity.downhill
                    .byDifficulty,
                  "count"
                )
              : null,
            totalRunKm: resort.properties.statistics.runs.byActivity.downhill
              ? getTotal(
                  resort.properties.statistics.runs.byActivity.downhill
                    .byDifficulty,
                  "lengthInKm"
                )
              : null,
            liftDetails: resort.properties.statistics.lifts.byType,
            runDetails: resort.properties.statistics.runs.byActivity.downhill,
            top: resort.properties.statistics.maxElevation,
            bottom: resort.properties.statistics.minElevation,
            vertical:
              resort.properties.statistics.maxElevation &&
              resort.properties.statistics.minElevation
                ? resort.properties.statistics.maxElevation -
                  resort.properties.statistics.minElevation
                : "",
            isOperating:
              resort.properties.status === "operating" ? true : false,
            isDownhill: resort.properties.activities.indexOf("downhill") > -1,

          })) || [];

        // include resort only if it's active, downhill, has a name and coordintes, and has some vertical
        const operatingDownhillResorts = resorts.filter(
          (resort) =>
            resort.isOperating &&
            resort.isDownhill &&
            resort.point &&
            resort.name &&
            resort.vertical
        );

        // calculate max vertical for slider operation
        const maxVertical = Math.max.apply(
          Math,
          operatingDownhillResorts.map(function (resort) {
            return resort.vertical;
          })
        );

        this.setState({
          maxVertical: maxVertical,
          verticalFilter: {
            min: 0,
            max: maxVertical,
          },
        });

        // trigger data load from Firebase to get Epic/Ikon data
        const skiFlags = firebase.database().ref();
        skiFlags.on("value", (snapshot) => {
          let currentResorts = operatingDownhillResorts;

          this.setState({
            resorts: currentResorts,
            filteredResorts: currentResorts,
          });
        });
      });
  }

  updateActiveResortList = () => {
    let {
      verticalFilter,
      maxVertical,
      searchTerm,
      passFilter,
      verticalUnits,
    } = this.state;
    let filteredResorts = this.state.resorts.filter(function (resort) {
      return shouldShowResort(
        resort,
        verticalFilter,
        maxVertical,
        searchTerm,
        passFilter,
        verticalUnits
      );
    });
    this.setState({
      filteredResorts: filteredResorts,
    });
  };

  showAllResorts = () => {
    this.setState({
      searchTerm: "",
      verticalFilter: { min: 0, max: this.state.maxVertical },
      passFilter: "all",
    }, () => {
      this.updateActiveResortList();
    });
  };

  updateSearchTerm = (s) => {
    this.setState({
      searchTerm: s,
    }, () => {
      this.updateActiveResortList();
    });
  };

  setPassType = (passType) => {
    this.setState({
      passFilter: passType,
    }, () => {
      this.updateActiveResortList();
    });
  };

  render() {
    let allResortsShown =
      this.state.filteredResorts.length === this.state.resorts.length;
    return (
      <div>
        <SkiMap
          resorts={this.state.filteredResorts}
          verticalFilter={this.state.verticalFilter}
          verticalUnits={this.state.verticalUnits}
        />
        <div className="controlContainer">
          <div className="skiHed">
            <div>
              <span>
                <DebounceInput
                  minLength={2}
                  className="resortNameSearch"
                  placeholder="filter by name"
                  value={this.state.searchTerm}
                  debounceTimeout={500}
                  onChange={(event) =>
                    this.updateSearchTerm(event.target.value)
                  }
                />
                <span className="resortCount">
                  showing {numberFormat(this.state.filteredResorts.length, 0)}
                  {!allResortsShown && (
                    <span>
                      {""} of {""}
                      {numberFormat(this.state.resorts.length, 0)}
                    </span>
                  )}
                  {""} resorts
                  {!allResortsShown && (
                    <button onClick={() => this.showAllResorts()}>
                      show all
                    </button>
                  )}
                </span>
              </span>
            </div>

          </div>
          <div className="vertSlider">
            <div className="vertSliderMeta">
              <p>Units</p>
              <select
                name="verticalUnits"
                value={this.state.verticalUnits}
                onChange={(e) => this.setState({ [e.target.name]: e.target.value })}
              >
                <option value="metric">m/km</option>
                <option value="imperial">ft/mi</option>
              </select>
            </div>
            <div className="vertSliderControl">
              <InputRange
                maxValue={this.state.maxVertical}
                maxLabel={""}
                minLabel={""}
                formatLabel={(value) => {
                  let verticalMultiplier =
                    this.state.verticalUnits === "imperial" ? 3.28084 : 1;
                  return `${numberFormat(value * verticalMultiplier, 0)} ${
                    this.state.verticalUnits === "imperial" ? "ft" : "m"
                  }`;
                }}
                minValue={0}
                step={100}
                value={this.state.verticalFilter}
                onChange={debounce((verticalFilter) => {
                  verticalFilter.min = verticalFilter.min >= 0 ? verticalFilter.min : 0;
                  verticalFilter.max = verticalFilter.max <= this.state.maxVertical ? verticalFilter.max : this.state.maxVertical;
                  this.setState({ verticalFilter });
                }, 16)}
                onChangeComplete={this.updateActiveResortList}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}
export default App;
