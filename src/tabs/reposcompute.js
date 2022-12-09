import _ from "lodash";
import { NavLink } from "react-router-dom";
import { useQuery, useMutation, gql } from "@apollo/client";
import React, { Component, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import ListGroup from 'react-bootstrap/ListGroup';
import { TwoPrecFloat } from "./widgets";

const REPOS = gql`
query{
  myRepos {
    name
    principal
    facilityObj {
      name
    }
    currentComputeAllocations {
      Id
      clustername
      start
      end
      qoses {
        name
        slachours
      }
      usage {
        slachours
        avgcf
      }
    }
  }
  whoami {
    username
  }
  facilities {
    name
  }
}`;


class ReposRows extends Component {
  constructor(props) {
    super(props);
    this.reponame = props.repo.name;
  }
  render() {
    var first = true;
    let cas = _.get(this.props.repo, "currentComputeAllocations", [{}]), rows = cas.length;
    let trs = _.map(cas, (a) => {
      let totalAllocatedHours = _.sum(_.map(_.get(a, "qoses", []), "slachours"))
      let totalUsedHours = _.sum(_.map(_.get(a, "usage", []), "slachours"));
      if(first) {
        first = false;
        return (
          <tr key={this.reponame+a.clustername} data-name={this.reponame}>
            <td rowSpan={rows} className="vmid">{this.reponame}</td>
            <td rowSpan={rows} className="vmid">{this.props.repo.facilityObj.name}</td>
            <td rowSpan={rows} className="vmid">{this.props.repo.principal}</td>
            <td><NavLink to={"/repos/compute/"+this.reponame+"/allocation/"+a.Id} key={this.reponame}>{a.clustername}</NavLink></td>
            <td>{totalAllocatedHours}</td>
            <td><TwoPrecFloat value={totalUsedHours}/></td>
          </tr>)
        } else {
          return (
            <tr key={this.reponame+a.clustername} data-name={this.reponame}>
              <td><NavLink to={"/repos/compute/"+this.reponame+"/allocation/"+a.Id} key={this.reponame}>{a.clustername}</NavLink></td>
              <td>{totalAllocatedHours}</td>
              <td><TwoPrecFloat value={totalUsedHours}/></td>
            </tr>)
        }
    });
    return ( <tbody>{trs}</tbody> )
  }
}


class ReposTable extends Component {
  constructor(props) {
    super(props);
  }
  render() {
    return (
      <>
      <div className="container-fluid text-center table-responsive">
        <table className="table table-condensed table-striped table-bordered">
          <thead>
            <tr><th>Name</th><th>Facility</th><th>PI</th><th>ClusterName</th><th>Total compute allocation</th><th>Total compute used</th></tr>
          </thead>
          { _.map(this.props.repos, (r) => { return (<ReposRows key={r.name} repo={r}/>) }) }
          </table>
        </div>
      </>
     )
  }
}

export default function ReposComputeListView() {
  const { loading, error, data } = useQuery(REPOS);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :</p>;

  let username = _.get(data, "whoami.username");
  let facilities = _.map(_.get(data, "facilities"), "name");
  console.log(data);

  return (
    <>
    <ReposTable repos={data.myRepos} />
    </>
  );
}
