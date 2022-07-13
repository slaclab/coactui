import { useQuery, useMutation, gql } from "@apollo/client";
import _ from "lodash";
import React, { Component, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";


const FACILITYDETAILS = gql`
query {
  facilities {
    name
    description
    czars
    accessClass
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
    this.state = { selectedFacility: this.props.selectedFacility }
    this.selectFacility = (event) => {
      let facilityName = event.currentTarget.getAttribute("data-name");
      console.log("Selecting  " + facilityName);
      this.setState({ selectedFacility: facilityName });
      this.props.onSelect(facilityName);
    }
  }

  render() {
    return (
      <>
      <div className="container-fluid text-center" id="users_content">
          <div className="table-responsive">
            <table className="table table-condensed table-striped table-bordered collabtbl">
              <thead>
                <tr>
                  <th>Faclity</th>
                  <th>Description</th>
                  <th>Czars</th>
                  <th>Access Class</th>
                  <th>Capacity start</th>
                  <th>Capacity end</th>
                </tr>
              </thead>
              <tbody>{
                _.map(this.props.facilities, (f) => { return(
                  <tr key={f.name} data-name={f.name} onClick={this.selectFacility} className={this.state.selectedFacility == f.name ? "bg-primary" : ''}>
 		   <td>{f.name}</td>
 		   <td>{f.description}</td>
       <td>{f.czars}</td>
       <td>{f.accessClass}</td>
 		   <td>{_.get(f, "capacity.start")}</td>
       <td>{_.get(f, "capacity.end")}</td>
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

class FacilitiesComputeTable extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    if(_.isEmpty(this.props.selectedFacility)) {
      return (<div/>)
    }

    let theFacility = _.keyBy(this.props.facilities, "name")[this.props.selectedFacility];
    console.log(theFacility);

    return (
      <>
      <div className="container-fluid text-center" id="users_content">
          <div className="table-responsive">
            <table className="table table-condensed table-striped table-bordered collabtbl">
              <thead>
                <tr>
                  <th>Cluster Name</th>
                  <th>Capacity (in slachours)</th>
                </tr>
              </thead>
              <tbody>{
                _.map(_.get(theFacility, "capacity.clusters", []), (c) => { return(
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

    if(_.isEmpty(this.props.selectedFacility)) {
      return (<div/>)
    }

    let theFacility = _.keyBy(this.props.facilities, "name")[this.props.selectedFacility];
    console.log(theFacility);

    return (
      <>
      <div className="container-fluid text-center" id="users_content">
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
                _.map(_.get(theFacility, "capacity.storage", []), (c) => { return(
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

export default function Facilities() {
  const { loading, error, data } = useQuery(FACILITYDETAILS, { errorPolicy: 'all'} );
  const [selectedFacility, setSelectedFacility] = useState("");

  if (loading) return <p>Loading...</p>;
//  if (error) return <p>Error :</p>;

  const triggerDetails = function(facilityname) {
    setSelectedFacility(facilityname)
  }

  console.log(data);

  return (
    <>
      <Container fluid>
       <div className="row no-gutters">
        <Row>
          <Col></Col>
          <Col></Col>
          <Col className="float-end">
            <RequestNewFacility />
          </Col>
        </Row>
       </div>
      </Container>
    <FacilitiesTable facilities={data.facilities} selectedFacility={_.get(data, "facilities[0].name")} onSelect={triggerDetails}/>
    <FacilitiesComputeTable selectedFacility={selectedFacility} facilities={data.facilities}/>
    <FacilitiesStorageTable selectedFacility={selectedFacility} facilities={data.facilities}/>
    </>
  );
}
