import { useQuery, useMutation, gql } from "@apollo/client";
import _ from "lodash";
import React, { Component, useState } from 'react';
import { Link, Outlet, useParams } from "react-router-dom";
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import { DateDisp } from './widgets';

const FACILITYDETAILS = gql`
query Facility($facilityinput: FacilityInput){
  facility(filter:$facilityinput) {
    name
    description
    czars
    accessgroup
    capacity {
      start
      end
      clusters {
        name
        slachours
      }
      storage {
        name
        gigabytes
        inodes
      }
    }
  }
}
`;

class FacilitiesTable extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <>
      <div className="container-fluid text-center">
        <div className="subsection1"><span>Details</span></div>
          <div className="table-responsive">
            <table className="table table-condensed table-bordered tbl-selectable">
              <thead>
                <tr>
                  <th>Facility</th>
                  <th>Description</th>
                  <th>Czars</th>
                  <th>Access Group</th>
                  <th>Capacity start</th>
                  <th>Capacity end</th>
                </tr>
              </thead>
              <tbody>
                <tr key={_.get(this.props.facility, "name")}>
                  <td>{_.get(this.props.facility, "name")}</td>
                  <td>{_.get(this.props.facility, "description")}</td>
                  <td>{_.get(this.props.facility, "czars")}</td>
                  <td>{_.get(this.props.facility, "accessgroup")}</td>
                  <td><DateDisp value={_.get(this.props.facility, "capacity.start")} /></td>
                  <td><DateDisp value={_.get(this.props.facility, "capacity.end")} /></td>
                </tr>
              </tbody>
            </table>
          </div>
       </div>
       </>
    )
  }
}

class FacilitiesComputeTable extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <>
      <div className="container-fluid text-center">
          <div className="subsection1"><span>Compute clusters</span></div>
          <div className="table-responsive">
            <table className="table table-condensed table-striped table-bordered collabtbl">
              <thead>
                <tr>
                  <th>Cluster Name</th>
                  <th>Capacity (in slachours)</th>
                </tr>
              </thead>
              <tbody>{
                _.map(_.get(this.props.facility, "capacity.clusters", []), (c) => { return(
                  <tr key={c.name} data-name={c.name}>
 		   <td>{c.name}</td>
 		   <td>{c.slachours}</td>
 		 </tr>
 	       ) } )
 	     }</tbody>
            </table>
          </div>
       </div>

       </>
    )
  }
}

class FacilitiesStorageTable extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <>
      <div className="container-fluid text-center">
        <div className="subsection1"><span>Storage volumes</span></div>
          <div className="table-responsive">
            <table className="table table-condensed table-striped table-bordered collabtbl">
              <thead>
                <tr>
                  <th>Cluster Name</th>
                  <th>Capacity (in gigabytes)</th>
                  <th>Capacity (in inodes)</th>
                </tr>
              </thead>
              <tbody>{
                _.map(_.get(this.props.facility, "capacity.storage", []), (c) => { return(
                  <tr key={c.name} data-name={c.name}>
 		   <td>{c.name}</td>
       <td>{c.gigabytes}</td>
       <td>{c.inodes}</td>
 		 </tr>
 	       ) } )
 	     }</tbody>
            </table>
          </div>
       </div>

       </>
    )
  }
}

class RequestNewFacility extends Component {
  render() {
    return <Button variant="secondary">Request New Facility</Button>
  }
}

export default function Facility(props) {
  //let params = useParams(), facilityname = params.facilityname;
  const { loading, error, data } = useQuery(FACILITYDETAILS, { variables: { facilityinput: { name: props.facilityname }}},  { errorPolicy: 'all'} );

  if (loading) return <p>Loading...</p>;
//  if (error) return <p>Error :</p>;

  console.log(data);
  let facility = data.facility;

  return (<div>
    <FacilitiesTable facility={facility}/>
    <FacilitiesComputeTable facility={facility}/>
    <FacilitiesStorageTable facility={facility}/>
  </div>);
}
