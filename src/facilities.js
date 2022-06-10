import { useQuery, useMutation, gql } from "@apollo/client";
import _ from "lodash";
import React, { Component } from 'react';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";


const FACILITYDETAILS = gql`
query {
  facilities {
    name
    description
  }
}
`;

class FacilitiesTable extends Component {
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
                  <th>Created</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>{
                _.map(this.props.facilities, (f) => { return(
                  <tr key={f.name} data-name={f.name}>
 		   <td>{f.name}</td>
 		   <td>{f.description}</td>
 		   <td>{f.czars}</td>
 		   <td>TBD</td>
 		   <td>TBD</td>
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

  if (loading) return <p>Loading...</p>;
//  if (error) return <p>Error :</p>;

	  console.log(data);

  return (
    <>
      <Container fluid>
       <div class="row no-gutters">
        <Row>
          <Col></Col>
          <Col></Col>
          <Col className="float-end">
            <RequestNewFacility />
          </Col>
        </Row>
       </div>
      </Container>
    <FacilitiesTable facilities={data.facilities} />
    </>
  );
}
