import React from "react";
import { useParams } from "react-router-dom";
import { useQuery, gql } from "@apollo/client";
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
      volumes {
        name
        purpose
        gigabytes
        inodes
      }
    }
    userAllocations(resource: $resourcename) {
      username
      repo
      percent
    }
    storageUsage(resource: $resourcename year: $datayear) {
      totalStorage
      totalInodes
    }
    perDayStorageUsage(resource: $resourcename year: $datayear) {
      date
      totalStorage
      totalInodes
    }
    perFolderStorageUsage(resource: $resourcename year: $datayear) {
      folder
      totalStorage
      totalInodes
    }
  }
}
`;


class TopTab extends React.Component {
  constructor(props) {
    super(props);
  }
  render() {
    return (<div className="row">
      <div className="col">
        <div className="h4">Storage</div>
        <div className="row"><span className="col-4">Storage Allocation:</span><span className="col-8">{this.props.storageusg.allocation.storage}</span></div>
        <div className="row"><span className="col-4">Storage Allocated to Directories:</span><span className="col-8"></span></div>
        <div className="row"><span className="col-4">Unallocated Storage:</span><span className="col-8"></span></div>
        <div className="row"><span className="col-4">Storage Used:</span><span className="col-8">{this.props.storageusg.usage.totalStorage}</span></div>
        <div className="row"><span className="col-4">% Storage Allocation Used:</span><span className="col-8"></span></div>
      </div>
      <div className="col">
        <div className="h4">Files</div>
        <div className="row"><span className="col-4">Files Allocation:</span><span className="col-8">{this.props.storageusg.allocation.inodes}</span></div>
        <div className="row"><span className="col-4">Files Allocated to Directories:</span><span className="col-8"></span></div>
        <div className="row"><span className="col-4">Unallocated Files:</span><span className="col-8"></span></div>
        <div className="row"><span className="col-4">Files Used:</span><span className="col-8">{this.props.storageusg.usage.totalInodes}</span></div>
        <div className="row"><span className="col-4">% File Allocation Used:</span><span className="col-8"></span></div>
      </div>
    </div>
    )
  }
}

class BottomTab extends React.Component {
  constructor(props) {
    super(props);
  }
  render() {
    return (
      <div className="table-responsive">
          <table className="table table-condensed table-striped table-bordered">
            <thead><tr><th>Directory</th><th>File System</th><th>Owner</th><th>Group</th><th>Active</th><th>Storage Used</th><th>Directory Storage Quota (TB)</th><th>% Storage Used</th><th>Files Used</th><th>Directory File Quota</th><th>% Files Used</th><th>Actions</th></tr></thead>
            <tbody>{_.map(this.props.storageusg.folders, (folder, k) => {
              return (<tr key={folder.folder} data-folder={folder.folder}><td>{folder.folder}</td><td></td><td></td><td></td><td></td><td>{folder.totalStorage}</td><td></td><td></td><td>{folder.totalInodes}</td><td></td><td></td><td></td></tr>)
            })}
            </tbody>
          </table>
        </div>
      );
  }
}

class StorageTab extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (<div className="container-fluid text-center tabcontainer">
      <TopTab storageusg={this.props.storageusg}/>
      <div className="midchart">
        <Plot data={this.props.chartdata} layout={this.props.layout}/>
      </div>
      <BottomTab storageusg={this.props.storageusg} users={this.props.users}/>
    </div>)
  }
}


export default function Storage() {
  let params = useParams(), reponame = params.name, resourcename = params.resourcename, datayear = dayjs().year();
  const { loading, error, data } = useQuery(REPODETAILS, { variables: { reposinput: { name: reponame }, resourcename: resourcename, datayear: datayear } });
  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :</p>;
  let repodata = data.repos[0];
  console.log(repodata);
  let allocations = _.get(repodata, "allocations[0]", {}),
    usage = _.get(repodata, "storageUsage[0]", {}),
    per_user_allocations = _.get(repodata, "userAllocations", []),
    per_day_usage = _.get(repodata, "perDayStorageUsage", []),
    per_folder_usage = _.get(repodata, "perFolderStorageUsage", []),
    users = _.get(repodata, "users", []);

  let storageusg = {"allocation": allocations, "usage": usage, folders: per_folder_usage};
  console.log(storageusg);

  let layout = { showlegend: false, yaxis: {range: [0, _.get(allocations, "totalStorage")]}};
  let daily_storage_usage = { x: [], y: [], type: 'scatter', "name": "Storage Used", fill: 'tozeroy' };
  _.each(per_day_usage, function(du){ daily_storage_usage.x.push(_.get(du, "date")); daily_storage_usage.y.push(_.get(du, "totalStorage"));})
  var chartdata = [ daily_storage_usage ];

  return (<StorageTab storageusg={storageusg} users={users} chartdata={chartdata} layout={layout} />);
}
