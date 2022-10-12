import React, { Component } from "react";
import { useQuery, useMutation, gql } from "@apollo/client";
import _ from "lodash";
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import { NavLink } from "react-router-dom";

const HOMEDETAILS = gql`
query {
  whoami {
    username
    uidnumber
    eppns
    preferredemail
    shell
    isAdmin
    groups
  }
}
`;
class UserDetails extends Component {
  constructor(props) {
    super(props);
  }
  render() {
    return (
      <>
      <Container fluid>
        <Row>
          <Col>
            <Card>
              <Card.Body>
              <Card.Title>Account details</Card.Title>
                <Row><Col md={3}><Card.Subtitle>Userid</Card.Subtitle></Col><Col>{this.props.userdetails.username}</Col></Row>
                <Row><Col md={3}><Card.Subtitle>UID</Card.Subtitle></Col><Col>{this.props.userdetails.uidnumber}</Col></Row>
                <Row><Col md={3}><Card.Subtitle>Preferred Email</Card.Subtitle></Col><Col>{this.props.userdetails.preferredemail}</Col></Row>
                <hr/>
                <Row><Col md={3}><Card.Subtitle>Shell</Card.Subtitle></Col><Col md={5}>{this.props.userdetails.shell}</Col><Col><Button variant="secondary">Change my shell</Button></Col></Row>
                <hr/>
                <Col>
                  <Row><Card.Subtitle>Aliases</Card.Subtitle></Row>

                  <Row><Col md={8}><ul className="ps-5">
                  {
                    _.map(this.props.userdetails.eppns, (e) => { return (<li key={e}>{e}</li>) })
                  }
                  </ul></Col><Col><Button variant="secondary">Add more aliases</Button></Col>
                  </Row>
                </Col>
                <hr/>
                <Row><Card.Subtitle>Group memberships</Card.Subtitle><ul className="ps-5">
                {
                  _.map(this.props.userdetails.groups, (e) => { return (<li key={e}>{e}</li>) })
                }
                </ul></Row>
              </Card.Body>
            </Card>
          </Col>
          <Col>
            <Card>
              <Card.Body>
              <Card.Title>Storage details</Card.Title>
                <Row><Col md={3}><Card.Subtitle>Userid</Card.Subtitle></Col><Col>{this.props.userdetails.username}</Col></Row>
                <Row><Col md={3}><Card.Subtitle>UID</Card.Subtitle></Col><Col>{this.props.userdetails.uidnumber}</Col></Row>
                <Row><Col md={3}><Card.Subtitle>Preferred Email</Card.Subtitle></Col><Col>{this.props.userdetails.preferredemail}</Col></Row>
                <hr/>
                <Col>
                  <Row><Card.Subtitle>Aliases</Card.Subtitle></Row>
                  <Row><ul className="ps-5">
                  {
                    _.map(this.props.userdetails.eppns, (e) => { return (<li key={e}>{e}</li>) })
                  }
                  </ul></Row>
                  <Button variant="secondary">Add more aliases</Button>
                </Col>
                <hr/>
                <Row><Col md={3}><Card.Subtitle>Shell</Card.Subtitle></Col><Col>{this.props.userdetails.shell}</Col><Col><Button variant="secondary">Change my shell</Button></Col></Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
      </>
    );
  }
}


export default function MyProfile() {
  const { loading, error, data } = useQuery(HOMEDETAILS, { errorPolicy: 'all'} );

  if (loading) return <p>Loading...</p>;
//  if (error) return <p>Error :</p>;

	  console.log(data);

  return (
    <>
      <UserDetails userdetails={data["whoami"]}/>
    </>
  );
}
