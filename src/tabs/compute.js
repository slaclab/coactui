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
      resources {
        name
        type
      }
    }
    allocations(resource: $resourcename) {
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
    }
    usage(resource: $resourcename year: $datayear) {
      facility
      resource
      repo
      year
      totalNodeSecs
      totalMachineSecs
      totalRawSecs
      averageChargeFactor
    }
    perDayUsage(resource: $resourcename year: $datayear) {
      facility
      resource
      repo
      year
      dayOfYear
      totalNodeSecs
      totalMachineSecs
      totalRawSecs
      averageChargeFactor
    }
    perUserUsage(resource: $resourcename year: $datayear) {
      facility
      resource
      repo
      year
      username
      totalNodeSecs
      totalMachineSecs
      totalRawSecs
      averageChargeFactor
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
      let allocatedNodeSecs = _.toNumber(allocation_percent)*this.props.repoallocation*3600/100;
      let remainingNodeSecs = allocatedNodeSecs - _.get(this.props.user, "totalNodeSecs", 0);
      let remaining = (remainingNodeSecs/allocatedNodeSecs)*100.0;
      return {
        "allocation": _.toNumber(allocation_percent),
        "allocatedNodeSecs": allocatedNodeSecs,
        "remainingNodeSecs": remainingNodeSecs,
        "remaining": remaining
      }
    }
    this.handleChange = (event) => {
      this.props.onAllocationChange(this.props.user.username, event.target.value);
      this.setState(this.computeRemaining(event.target.value));
    }
    this.state = this.computeRemaining(_.get(this.props.user, "allocation.compute", 0));
  }

  render() {
    return (<tr data-userid={this.props.user.username}>
      <td>{this.props.user.username}</td>
      <td><input className="percent allocation_input" type="number" defaultValue={this.state.allocation} onBlur={this.handleChange}/><span className="invalid-feedback"></span></td>
      <td className="allocated"><NodeSecs value={this.state.allocatedNodeSecs}/></td>
      <td className="allocated"><NodeSecs value={this.props.user.totalNodeSecs}/></td>
      <td className="allocated"><NodeSecs value={this.props.user.totalMachineSecs}/></td>
      <td className="allocated"><NodeSecs value={this.props.user.totalRawSecs}/></td>
      <td><ChargeFactor value={this.props.user.averageChargeFactor}/></td>
      <td className="remaining"><Percent value={this.state.remaining}/></td></tr>);
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
          <span className="col-2"><NodeSecs value={this.props.cmpusg.compute}/></span>
          <span className="col-2"><label>Machine hours used</label></span>
          <span className="col-2"><NodeSecs value={this.props.cmpusg.totalMachineSecs}/></span>
          <span className="col-2"><label>ERCAP request</label></span>
          <span className="col-2"><NodeSecs value={this.props.cmpusg.ercap_request}/></span>
        </div>
        <div className="row">
          <span className="col-2"><label>NERSC hours charged</label></span>
          <span className="col-2"><NodeSecs value={this.props.cmpusg.totalNodeSecs}/></span>
          <span className="col-2"><label>Raw hours used</label></span>
          <span className="col-2"><NodeSecs value={this.props.cmpusg.totalRawSecs}/></span>
          <span className="col-2"><label>ERCAP award</label></span>
          <span className="col-2"><NodeSecs value={this.props.cmpusg.ercap_award}/></span>
        </div>
        <div className="row">
          <span className="col-2"><label>Available hours</label></span>
          <span className="col-2"><NodeSecs value={this.props.cmpusg.available_secs}/></span>
          <span className="col-2"><label>Average charge factor</label></span>
          <span className="col-2"><ChargeFactor value={this.props.cmpusg.averageChargeFactor}/></span>
          <span className="col-2"><label>Premium Threshold reached</label></span>
          <span className="col-2">{this.props.cmpusg.premium_threshold_reached}</span>
        </div>
        <div className="row">
          <span className="col-2"><label>Remaining %</label></span>
          <span className="col-2"><Percent value={this.props.cmpusg.remaining_percent}/></span>
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
            <tbody>{_.map(this.props.users, (user, k) => ( <User key={user.username}  user={user} repoallocation={this.props.cmpusg["compute"]} onAllocationChange={this.props.onAllocationChange}/> ))}</tbody>
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
      <TopTab cmpusg={this.props.cmpusg}/>
      <div className="midchart">
        <Plot data={this.props.chartdata} layout={this.props.layout}/>
      </div>
      <BottomTab cmpusg={this.props.cmpusg} users={this.props.users} allocations={this.state} onAllocationChange={this.props.onAllocationChange} updateAllocations={this.props.updateAllocations}/>
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
  let facility = repodata["facility"], allocations = _.get(repodata, "allocations[0]", {}),
    usage = _.get(repodata, "usage[0]", {}),
    per_user_allocations = _.get(repodata, "userAllocations", []),
    per_user_usage = _.get(repodata, "perUserUsage", []),
    per_day_usage = _.get(repodata, "perDayUsage", []),
    repo_users = _.get(repodata, "users", []);
  var cmpusg = _.defaults({}, usage, allocations);
  cmpusg["available_secs"] = cmpusg["compute"]*3600 - cmpusg["totalNodeSecs"];
  cmpusg["remaining_percent"] = (cmpusg["available_secs"]/(cmpusg["compute"]*3600))*100.0;
  console.log(cmpusg);
  // Users can come and go.. Collect all the users from the various sources.
  var users = _.fromPairs(_.map(_.union(_.map(per_user_allocations, "username"), _.map(per_user_usage, "username"), repo_users), u=> [u, {"username": u}]));
  _.each(users, u => { u["allocatedNodeSecs"] = 0; u["remainingNodeSecs"]=0; u["remaining"]=100; })
  _.each(per_user_allocations, function(v,k){ users[v["username"]]["allocation"] = _.cloneDeep(v) });
  _.each(per_user_usage, function(pu){
    let u = users[pu["username"]];
    _.each(["totalNodeSecs", "totalMachineSecs", "totalRawSecs", "totalNodeSecs", "averageChargeFactor"], function(at) { u[at] = pu[at]; })
    u["allocatedNodeSecs"] = _.get(u, "allocation.compute", 0)*cmpusg["compute"]*3600/100;
    u["remainingNodeSecs"] = u["allocatedNodeSecs"] - _.get(u, "totalNodeSecs");
    u["remaining"] = (u["remainingNodeSecs"]/u["allocatedNodeSecs"])*100.0;
  });

  let layout = { showlegend: true, legend: { x: 0.075, xanchor: 'center', y: 0.98, font: { family: 'Optima, Helevetica, Lucida Grande, Lucida Sans, sans-serif', size: 14, color: '#000' } }, autosize: false, width: window.innerWidth, height: 0.4*window.innerHeight, margin: { t: 0, b: 0 } };
  let uniform_charge_rate = { x: [], y: [], type: 'scatter', name: "Uniform Charge Rate" }, daily_charge_rate = { x: [], y: [], type: 'scatter', "name": "NERSC hours charged" };
  let daily_usage_by_day = _.keyBy(per_day_usage, "dayOfYear"), avg_allocation = allocations["compute"]/(dayjs().endOf("year").diff(dayjs().startOf('year'), "days")), cuml_daily_usage = 0, today = dayjs();
  for(let i=0, d = dayjs().startOf('year'); d.isBefore(dayjs().endOf("year")); d = d.add(1, "days"), i=i+1) {
    uniform_charge_rate.x.push(d.toDate()); uniform_charge_rate.y.push(i*avg_allocation);
    if(d.isBefore(today)){ daily_charge_rate.x.push(d.toDate()); cuml_daily_usage = cuml_daily_usage + (_.get(daily_usage_by_day, i+1+".totalNodeSecs", 0))/3600.0; daily_charge_rate.y.push(cuml_daily_usage); }
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
        year: datayear,
        username: u["username"],
        compute: _.get(u, "allocation.compute", 0)
      }
    })
    console.log(data);
    updateUserAllocation({ variables: { reposinput: { name: reponame }, data: data } });
  }

  return (<ComputeTab cmpusg={cmpusg} users={users} chartdata={chartdata} layout={layout} onAllocationChange={changeAllocation} updateAllocations={updateAllocations} />);
}
