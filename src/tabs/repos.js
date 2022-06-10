import _ from "lodash";
import { NavLink } from "react-router-dom";
import { useQuery, gql } from "@apollo/client";
import React, { Component } from 'react';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";


const REPOS = gql`
query{
  myRepos {
    name
    principal
    facilityObj {
      name
    }
  }
}`;


class ReposTable extends Component {
  constructor(props) {
    super(props);
  }
  render() {
    return (
      <>
      <div className="container-fluid text-center table-responsive">
        <table className="table table-condensed table-striped table-bordered">
          <thead><tr><th>Name</th><th>Facility</th><th>PI</th><th>Total compute allocation</th><th>Total compute used</th><th>Total storage allocation</th><th>Total storage used</th></tr></thead>
          <tbody>{
                  _.map(this.props.repos, (r) => { return (
                                <tr key={r.name} data-name={r.name}>
                                  <td><NavLink to={`/repos/${r.name}`} key={r.name}>{r.name}</NavLink></td>
                                  <td>{r.facilityObj.name}</td>
                                  <td>{r.principal}</td>
                                  <td>TBD</td>
                                  <td>TBD</td>
                                  <td>TBD</td>
                                  <td>TBD</td>
                                </tr>
                              )})
                    }
            </tbody>
          </table>
        </div>
      </>
     )
  }
}

class RequestAddToRepo extends Component {
  render() {
    return <Button variant="primary">Request Repo Membership</Button>
  }
}

class RequestNewRepo extends Component {
  render() {
    return <Button variant="secondary">Request New Repo</Button>
  }
}


export default function Repos() {
  const { loading, error, data } = useQuery(REPOS);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :</p>;

  return (
    <>
    <Container fluid>
     <div class="row no-gutters">
      <Row>
        <Col></Col>
        <Col></Col>
        <Col className="float-end">
          <RequestAddToRepo />
          <RequestNewRepo />
        </Col>
      </Row>
     </div>
    </Container>

    <ReposTable repos={data.myRepos} />
    </>
  );
}
