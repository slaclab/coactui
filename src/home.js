import React, { Component } from "react";
import { useQuery, useMutation, gql } from "@apollo/client";
import _ from "lodash";
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { NavLink } from "react-router-dom";

const HOMEDETAILS = gql`
query {
  whoami {
    username
    uidnumber
  }
}
`;
class TopTab extends Component {
  constructor(props) {
    super(props);
  }
  render() {
    return (
      <div className="toptbl">
        <div className="row">
          <span className="col-2"><label>Username</label></span>
          <span className="col-2"><p>{this.props.username}</p></span>
          <span className="col-2"><label>uid number</label></span>
          <span className="col-2"><p>{this.props.uid}</p></span>
        </div>
      </div>
    );
  }
}

class StorageTable extends Component {
  render() {
        return (
                      <>
                      <div className="container-fluid text-center table-responsive">
                        <table className="table table-condensed table-striped table-bordered">
                          <thead><tr><th>Storage Volume</th><th>Storage Class</th><th>Quota</th><th>Utilized</th></tr></thead>
                          <tbody>{
                                                                    _.map(this.props.groups, (r) => { return (
                                                                                                                                                <tr key={r.name} data-name={r.name}>
                                                                                                                                                  <td><NavLink to={`/repos/${r.name}`} key={r.name}>{r.name}</NavLink></td>
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

class GroupMembershipTable extends Component {
  render() {
        return (
                <>
                <div className="container-fluid text-center table-responsive">
                  <table className="table table-condensed table-striped table-bordered">
                    <thead><tr><th>Group Name</th><th>Group Number</th></tr></thead>
                    <tbody>{
                                        _.map(this.props.groups, (r) => { return (
                                                                          <tr key={r.name} data-name={r.name}>
                                                                            <td><NavLink to={`/repos/${r.name}`} key={r.name}>{r.name}</NavLink></td>
                                                                            <td>{r.facilityObj.name}</td>
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

class AssociateNewAlias extends Component {
  render() {
		return <Button variant="secondary">Associate New Alias</Button>
	}
}

export default function Home() {
  const { loading, error, data } = useQuery(HOMEDETAILS, { errorPolicy: 'all'} );

  if (loading) return <p>Loading...</p>;
//  if (error) return <p>Error :</p>;

	  console.log(data);
  
  return (
    <>
      <TopTab username={data["whoami"].username} uid={data["whoami"].uidnumber}/>
      <Container fluid>
       <div class="row no-gutters">
        <Row>
          <Col></Col>
          <Col></Col>
          <Col className="float-end">
            <AssociateNewAlias />
          </Col>
        </Row>
       </div>
      </Container>
      <GroupMembershipTable />
      <StorageTable />
    </>
  );
}
