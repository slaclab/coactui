import React from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, gql } from "@apollo/client";
import dayjs from "dayjs";
import Plot from "react-plotly.js";
import { ChargeFactor, NodeSecs, Percent } from "./widgets";
import _ from "lodash";

const REPODETAILS = gql`
query Repos($reposinput: RepoInput $resourcename: String! $datayear: Int!){
  repos(filter:$reposinput) {
    name
    facility
    users
    facilityObj {
      name
      resources
    }
    currentAllocations(resource: $resourcename) {
      resource
      facility
      start
      end
      qoses {
        name
        slachours
      }
    }
    userAllocations(resource: $resourcename) {
      facility
      resource
      repo
      username
      percent
    }
    usage(resource: $resourcename) {
      facility
      resource
      repo
      slacsecs
      machinesecs
      rawsecs
      avgcf
    }
    perDayUsage(resource: $resourcename year: $datayear) {
      facility
      resource
      repo
      year
      dayOfYear
      slacsecs
      machinesecs
      rawsecs
      avgcf
    }
    perUserUsage(resource: $resourcename year: $datayear) {
      facility
      resource
      repo
      username
      slacsecs
      machinesecs
      rawsecs
      avgcf
    }
  }
}
`;

const ALLOCATION_MUTATION = gql`
mutation UpdateUserAllocation($reposinput: RepoInput!, $data: [UserAllocationInput!]!){
  updateUserAllocation(repo: $reposinput, data: $data){
    name
  }
}
`;


class User extends React.Component {
  constructor(props) {
    super(props);
    this.computeRemaining = (allocation_percent) => {
      let allocated_slac_secs = _.toNumber(allocation_percent)*this.props.repoallocation*3600/100;
      let remaining_slac_secs = allocated_slac_secs - _.get(this.props.user, "slacsecs", 0);
      let remaining_percent = (remaining_slac_secs/allocated_slac_secs)*100.0;
      return {
        "allocation": _.toNumber(allocation_percent),
        "allocated_slac_secs": allocated_slac_secs,
        "remaining_slac_secs": remaining_slac_secs,
        "remaining_percent": remaining_percent
      }
    }
    this.handleChange = (event) => {
      this.props.onAllocationChange(this.props.user.username, event.target.value);
      this.setState(this.computeRemaining(event.target.value));
    }
    this.state = this.computeRemaining(_.get(this.props.user, "allocation.percent", 0));
  }

  render() {
    return (<tr data-userid={this.props.user.username}>
      <td>{this.props.user.username}</td>
      <td><input className="percent allocation_input" type="number" defaultValue={this.state.allocation} onBlur={this.handleChange}/><span className="invalid-feedback"></span></td>
      <td className="allocated"><NodeSecs value={this.state.allocated_slac_secs}/></td>
      <td className="allocated"><NodeSecs value={this.props.user.slacsecs}/></td>
      <td className="allocated"><NodeSecs value={this.props.user.machinesecs}/></td>
      <td className="allocated"><NodeSecs value={this.props.user.rawsecs}/></td>
      <td><ChargeFactor value={this.props.user.averageChargeFactor}/></td>
      <td className="remaining"><Percent value={this.state.remaining_percent}/></td></tr>);
    }
}

class TopTab extends React.Component {
  constructor(props) {
    super(props);
  }
  render() {
    return (<div className="toptbl">
        <div className="row">
          <span className="col-2"><label>Current allocation</label></span>
          <span className="col-2">{this.props.data.current_allocation}</span>
          <span className="col-2"><label>Available hours</label></span>
          <span className="col-2"><NodeSecs value={this.props.data.available_secs}/></span>
          <span className="col-2"><label>Raw hours used</label></span>
          <span className="col-2"><NodeSecs value={this.props.data.raw_secs_charged}/></span>
        </div>
        <div className="row">
          <span className="col-2"><label>SLAC hours charged</label></span>
          <span className="col-2"><NodeSecs value={this.props.data.slac_secs_charged}/></span>
          <span className="col-2"><label>Remaining %</label></span>
          <span className="col-2"><Percent value={this.props.data.remaining_percent}/></span>
          <span className="col-2"><label>Premium reached</label></span>
          <span className="col-2">TBD</span>
        </div>
        <div className="row">
          <span className="col-2"><label>Average charge factor</label></span>
          <span className="col-2"><ChargeFactor value={this.props.data.average_charge_factor}/></span>
          <span className="col-2"><label>Machine hours used</label></span>
          <span className="col-2"><NodeSecs value={this.props.data.machine_secs_charged}/></span>
        </div>
        </div>
      );
  }
}

class BottomTab extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="btmtbl">
        <button type="button" className="btn btn-primary" onClick={this.props.updateAllocations}>Update Allocations</button>
        <div className="table-responsive">
          <table className="table table-condensed table-striped table-bordered">
            <thead><tr><th>UserID</th><th>Allocation (% of repo)</th><th>Allocated NERSC hours</th><th>Charged NERSC hours</th><th>Charged machine hours</th><th>Charged node hours</th><th>Average Charge factor</th><th>Remaining</th></tr></thead>
            <tbody>{_.map(this.props.users, (user, k) => ( <User key={user.username}  user={user} repoallocation={this.props.current_allocation} onAllocationChange={this.props.onAllocationChange}/> ))}</tbody>
          </table>
        </div>
      </div>
    );
    }
}

class ComputeTab extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (<div className="container-fluid text-center tabcontainer">
      <TopTab data={this.props.toptbldata}/>
      <div className="midchart">
        <Plot data={this.props.chartdata} layout={this.props.layout}/>
      </div>
      <BottomTab users={this.props.btmtbldata} allocations={this.state} current_allocation={this.props.toptbldata.current_allocation} onAllocationChange={this.props.onAllocationChange} updateAllocations={this.props.updateAllocations}/>
    </div>)
  }
}

export default function Compute() {
  let params = useParams(), reponame = params.name, resourcename = params.resourcename, datayear = dayjs().year();
  const { loading, error, data } = useQuery(REPODETAILS, { variables: { reposinput: { name: reponame }, resourcename: resourcename, datayear: datayear } });
  const [ updateUserAllocation, { allocdata, allocloading, allocerror }] = useMutation(ALLOCATION_MUTATION);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :</p>;
  let repodata = data.repos[0];
  console.log(repodata);
  let facility = repodata["facility"], allocations = _.get(repodata, "currentAllocations[0]", {}),
    usage = _.get(repodata, "usage[0]", {}),
    per_user_allocations = _.get(repodata, "userAllocations", []),
    per_user_usage = _.get(repodata, "perUserUsage", []),
    per_day_usage = _.get(repodata, "perDayUsage", []),
    repo_users = _.get(repodata, "users", []);
  let toptbldata = {
    current_allocation: _.sum(_.map(_.get(allocations, "qoses", []), "slachours")),
    current_allocation_secs: _.sum(_.map(_.get(allocations, "qoses", []), "slachours"))*3600,
    slac_secs_charged: _.get(usage, "slacsecs"),
    machine_secs_charged: _.get(usage, "machinesecs"),
    raw_secs_charged: _.get(usage, "rawsecs")
  }
  toptbldata.available_secs = toptbldata.current_allocation_secs - toptbldata.slac_secs_charged;
  toptbldata.remaining_percent = (toptbldata.available_secs/toptbldata.current_allocation_secs)*100.0;
  toptbldata.average_charge_factor = toptbldata.slac_secs_charged/toptbldata.raw_secs_charged;
  //console.log(toptbldata);

  // Users can come and go.. Collect all the users from the various sources.
  var users = _.fromPairs(_.map(_.union(_.map(per_user_allocations, "username"), _.map(per_user_usage, "username"), repo_users), u=> [u, {username: u, allocated_slac_secs: 0, remaining_slac_secs: 0, remaining_percent: 100}]));
  _.each(per_user_allocations, function(v,k){ users[v["username"]]["allocation"] = _.cloneDeep(v) });
  _.each(per_user_usage, function(pu){
    let u = users[pu["username"]];
    _.each(["slacsecs", "machinesecs", "rawsecs", "avgcf"], function(at) { u[at] = pu[at]; })
    u["allocated_slac_secs"] = _.get(u, "allocation.percent", 0)*toptbldata.current_allocation_secs/100;
    u["remaining_slac_secs"] = u["allocated_slac_secs"] - _.get(u, "slacsecs");
    u["remaining_percent"] = (u["remaining_slac_secs"]/u["allocated_slac_secs"])*100.0;
  });
  // console.log(users);

  let layout = { showlegend: true, legend: { x: 0.075, xanchor: 'center', y: 0.98, font: { family: 'Optima, Helevetica, Lucida Grande, Lucida Sans, sans-serif', size: 14, color: '#000' } }, autosize: false, width: window.innerWidth, height: 0.4*window.innerHeight, margin: { t: 0, b: -0.1 } };
  let uniform_charge_rate = { x: [], y: [], type: 'scatter', name: "Uniform Charge Rate" }, daily_charge_rate = { x: [], y: [], type: 'scatter', "name": "SLAC hours charged" };
  let daily_usage_by_day = _.keyBy(per_day_usage, "dayOfYear"), avg_allocation = toptbldata.current_allocation/(dayjs().endOf("year").diff(dayjs().startOf('year'), "days")), cuml_daily_usage = 0, today = dayjs();
  for(let i=0, d = dayjs().startOf('year'); d.isBefore(dayjs().endOf("year")); d = d.add(1, "days"), i=i+1) {
    uniform_charge_rate.x.push(d.toDate()); uniform_charge_rate.y.push(i*avg_allocation);
    if(d.isBefore(today)){ daily_charge_rate.x.push(d.toDate()); cuml_daily_usage = cuml_daily_usage + (_.get(daily_usage_by_day, i+1+".slacsecs", 0))/3600.0; daily_charge_rate.y.push(cuml_daily_usage); }
  }
  var chartdata = [uniform_charge_rate, daily_charge_rate];

  let changeAllocation = (username, allocation_percent) => {
    console.log("Changing allocation for user " + username + " to " + _.toNumber(allocation_percent));
    let allc = {};
    _.set(users[username], "allocation.compute", _.toNumber(allocation_percent));
    console.log(users[username]);
  }

  let updateAllocations = function() {
    console.log("Update allocations");
    let data = _.map(users, (u,k) => {
      return {
        facility: facility,
        resource: resourcename,
        repo: reponame,
        username: u["username"],
        percent: _.get(u, "allocation.compute", 0)
      }
    })
    console.log(data);
    updateUserAllocation({ variables: { reposinput: { name: reponame }, data: data } });
  }

  return (<ComputeTab toptbldata={toptbldata} btmtbldata={users} chartdata={chartdata} layout={layout} onAllocationChange={changeAllocation} updateAllocations={updateAllocations} />);
}
