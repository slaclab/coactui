import { useQuery, useMutation, useLazyQuery, gql } from "@apollo/client";
import _ from "lodash";
import React, { Component, useState } from 'react';
import { NavLink } from "react-router-dom";
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Modal from 'react-bootstrap/Modal';
import ModalHeader from 'react-bootstrap/ModalHeader';
import ModalBody from 'react-bootstrap/ModalBody';
import ModalFooter from 'react-bootstrap/ModalFooter';
import { SearchAndAdd } from "./widgets";
import { TeraBytes } from './widgets';

const FACILITYDETAILS = gql`
query Facility($facilityinput: FacilityInput){
  facility(filter:$facilityinput) {
    name
    description
    czars
    serviceaccount
    servicegroup
    computepurchases {
      clustername
      purchased
      allocated
      used
    }
    storagepurchases {
      storagename
      purpose
      purchased
      allocated
      used
    }
  }
}
`;

const USERNAMES = gql`
query users {
  users {
    username
  }
}`;

const ADD_CZAR_MUTATION = gql`
mutation facilityAddCzar($facilityinput: FacilityInput!, $user: UserInput!) {
  facilityAddCzar(facility: $facilityinput, user: $user) {
    name
  }
}
`;

const REMOVE_CZAR_MUTATION = gql`
mutation facilityRemoveCzar($facilityinput: FacilityInput!, $user: UserInput!) {
  facilityRemoveCzar(facility: $facilityinput, user: $user) {
    name
  }
}
`;


class FacilityComputePurchases extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <Col>
        <Card className="facrsc">
          <Card.Header>Compute</Card.Header>
          <Card.Body>
            <Row className="mb-2">
              <Col md={3}><span className="tbllbl">Cluster</span></Col>
              <Col md={3}><span className="tbllbl">Acquired</span></Col>
              <Col md={3}><span className="tbllbl">Allocated</span></Col>
              <Col md={3}><span className="tbllbl">Used</span></Col>
            </Row>
            {
              _.map(this.props.facility.computepurchases, (p) => { return (
                <Row key={p.clustername} className="mb-2">
                  <Col md={3}><NavLink to={"/clusterusage/"+p.clustername} key={p.clustername}>{p.clustername}</NavLink></Col>
                  <Col md={3}>{p.purchased}</Col>
                  <Col md={3}>{p.allocated}</Col>
                  <Col md={3}>{p.used.toFixed(2)}</Col>
                </Row>

              ) })
            }
          </Card.Body>
        </Card>
      </Col>
    )
  }
}

class FacilityStoragePurchases extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <Col>
        <Card className="facrsc">
          <Card.Header>Storage</Card.Header>
          <Card.Body>
            <Row className="mb-2">
              <Col md={3}><span className="tbllbl">Storage Class</span></Col>
              <Col md={3}><span className="tbllbl">Purpose</span></Col>
              <Col md={2}><span className="tbllbl">Acquired (TB)</span></Col>
              <Col md={2}><span className="tbllbl">Allocated (TB)</span></Col>
              <Col md={2}><span className="tbllbl">Used (TB)</span></Col>
            </Row>
            {
              _.map(this.props.facility.storagepurchases, (p) => { return (
                <Row key={p.storagename+p.purpose} className="mb-2">
                  <Col md={3}><NavLink to={"/storageusage/"+p.storagename} key={p.storagename}>{p.storagename}</NavLink></Col>
                  <Col md={3}><NavLink to={"/storageusage/"+p.storagename+"/purpose/"+p.purpose} key={p.storagename+p.purpose}>{p.purpose}</NavLink></Col>
                  <Col md={2}><TeraBytes value={p.purchased}/></Col>
                  <Col md={2}><TeraBytes value={p.allocated}/></Col>
                  <Col md={2}><TeraBytes value={p.used}/></Col>
                </Row>

              ) })
            }
          </Card.Body>
        </Card>
      </Col>
    )
  }
}


class AddRemoveCzar extends Component {
  constructor(props) {
    super(props);
    this.usernames = [];
    this.loadUserNames = () => {
      this.props.getUserNames({onCompleted: (users)=>{this.usernames = _.map(_.get(users, "users"), "username", [])}});
    }
  }

  render() {
    return (
      <Modal show={this.props.showModal} onEnter={this.loadUserNames}>
        <ModalHeader>
          Search for users and add/remove them to/from as czars for this facility.
        </ModalHeader>
        <ModalBody>
          <SearchAndAdd label="Username" alloptions={this.usernames} selected={this.props.facility.czars} onSelDesel={this.props.onSelDesel}/>
        </ModalBody>
        <ModalFooter>
          <Button onClick={() => {this.props.setShowModal(false)}}>
            Done
          </Button>
        </ModalFooter>
    </Modal>
    );
  }
}


class FacilityDetails extends Component {
  constructor(props) {
    super(props);
    this.state = { showCzarModal: false }
  }

  render() {
    return (
      <Container fluid>
        <Row>
          <Col>
            <Card>
              <Card.Header>Details</Card.Header>
              <Card.Body>
                <Row><Col md={3}><span className="tbllbl">Name</span></Col><Col>{this.props.facility.name}</Col></Row>
                <Row><Col md={3}><span className="tbllbl">Description</span></Col><Col>{this.props.facility.description}</Col></Row>
              </Card.Body>
            </Card>
          </Col>
          <Col>
            <Card>
              <Card.Header>Czars</Card.Header>
              <Card.Body>
                <Row><Col md={8}><ul className="ps-5">
                {
                  _.map(this.props.facility.czars, (z) => { return (<li key={z}>{z}</li>) })
                }
                </ul></Col><Col><Button variant="secondary" onClick={() => { this.setState({showCzarModal: true})}}>Add/Remove Czars</Button></Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
          <Col>
            <Card>
              <Card.Header>Service Accounts</Card.Header>
              <Card.Body>
                <Row><Col md={3}><span className="tbllbl">User</span></Col><Col md={5}>{_.get(this.props.facility, "serviceaccount")}</Col></Row>
                <Row><Col md={3}><span className="tbllbl">Group</span></Col><Col md={5}>{_.get(this.props.facility, "servicegroup")}</Col></Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        <Row>
          <FacilityComputePurchases facility={this.props.facility}/>
          <FacilityStoragePurchases facility={this.props.facility}/>
          <AddRemoveCzar facility={this.props.facility} getUserNames={this.props.getUserNames} onSelDesel={this.props.onSelDesel} showModal={this.state.showCzarModal} setShowModal={(val) => { this.setState({showCzarModal: val})} }/>
        </Row>
      </Container>
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
  const [getUserNames, { unloading, unerror, undata }] = useLazyQuery(USERNAMES);
  const [ addCzarMutation ] = useMutation(ADD_CZAR_MUTATION);
  const [ removeCzarMutation ] = useMutation(REMOVE_CZAR_MUTATION);


  let addRemoveCzar = function(username, selected) {
    if(selected) {
      console.log("Adding user " + username + " as a czar to facility " + facility);
      addCzarMutation({ variables: { facilityinput: { name: props.facilityname }, user: { username: username } }, refetchQueries: [ FACILITYDETAILS, 'Facility' ], onError: (error) => { console.log("Error when adding czar " + error); } });
    } else {
      console.log("Removing user " + username + " as a czar from facility " + facility);
      removeCzarMutation({ variables: { facilityinput: { name: props.facilityname }, user: { username: username } }, refetchQueries: [ FACILITYDETAILS, 'Facility' ], onError: (error) => { console.log("Error when removing czar " + error); } });
    }
  }



  if (loading) return <p>Loading...</p>;
//  if (error) return <p>Error :</p>;

  console.log(data);
  let facility = data.facility;

  return (<div>
    <FacilityDetails facility={facility} getUserNames={getUserNames} onSelDesel={addRemoveCzar} />
  </div>);
}
