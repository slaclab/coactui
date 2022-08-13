import _ from "lodash";
import { Nav, Navbar, NavDropdown, Container, Modal, Form, Button, InputGroup } from 'react-bootstrap';
import { useQuery, gql } from "@apollo/client";
import { NavLink } from "react-router-dom";
import React, { Component, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRocket, faPerson, faPersonCircleQuestion } from '@fortawesome/free-solid-svg-icons'

const USER = gql`
query whoami{
  whoami {
    username
    isAdmin
  }
  users {
    username
  }
}`;


    //; window.open("https://vouch.slac.stanford.edu/logout")}>Log Out..</NavDropdown.Item>
function logged_in( props ) {
  return(
     <>
     <Nav.Item>
       <FontAwesomeIcon icon={faPerson} size="2x"/>
     </Nav.Item>
     <NavDropdown align="end" title={props.logged_in_user} id="nav-dropdown">
       <NavDropdown.Item href="https://vouch.slac.stanford.edu/logout">Log out...</NavDropdown.Item>
       <NavDropdown.Item className={props.isAdmin ? "" : "d-none"} onClick={props.impersonate}>Impersonate...</NavDropdown.Item>
       <NavDropdown.Divider />
       <NavDropdown.Item eventKey="4.4">My Aliases...</NavDropdown.Item>
     </NavDropdown>
     </>
  );
}

class Impersonate extends Component {
  constructor(props) {
    super(props);
    this.state = { impname: "", impnameInvalid: false, errormsg: "" }
    this.handleClose = () => { this.props.setShow(false); }
    this.impersonate = () => {
      console.log(this.state.impname);
      if(_.isEmpty(this.state.impname)) {
        this.setState({ impnameInvalid: true, errormsg: "Please enter a valid username" });
        return;
      }
      if(!_.includes(this.props.usernames, this.state.impname)) {
        this.setState({ impnameInvalid: true, errormsg: this.state.impname + " is not a valid username" });
        return;
      }


      this.props.impersonate(this.state.impname);
      this.props.setShow(false);
    }
    this.setImpName = (event) => { this.setState({ impname: event.target.value }) }
  }
  render() {
    return (
      <Modal show={this.props.show} onHide={this.handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Impersonate user</Modal.Title>
        </Modal.Header>
        <Modal.Body>Please select the user to impersonate
          <InputGroup hasValidation>
            <Form.Control type="text" placeholder="Please select the user to impersonate" onChange={this.setImpName} isInvalid={this.state.impnameInvalid}/>
            <Form.Control.Feedback type="invalid">{this.state.errormsg}</Form.Control.Feedback>
          </InputGroup>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={this.handleClose}>
            Close
          </Button>
          <Button variant="primary" onClick={this.impersonate}>
            Impersonate
          </Button>
        </Modal.Footer>
      </Modal>
    )
  }
}

class LoginLink extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.state = {menuIsOpened: false}
    this.handleToggle = this.handleToggle.bind(this);
  }
  handleToggle(toggle) {
  }
  render() {
    return (
      <>
      <Nav.Item>
        <FontAwesomeIcon icon={faPersonCircleQuestion} size="2x" />
      </Nav.Item>
      <Nav.Item><a href="/login" class="nav-link active">Log in...</a></Nav.Item>
      </>
    );
  }
}

function UserDropDown( props ) {
	console.log(props);
  if( props.logged_in_user === undefined ){
	  return <LoginLink/>;
	}
	return logged_in( props );
}

export default function TopNavBar( ) {
  let logged_in_user = undefined;
  let isAdmin = false;
  let usernames = [];
  const [show, setShow] = useState(false);
  const { loading, error, data } = useQuery(USER);
  if (loading) return <p>Loading...</p>;
  if ( data !== undefined && data.hasOwnProperty("whoami") ) {
    logged_in_user = data["whoami"].username;
    isAdmin = data["whoami"].isAdmin;
    usernames = _.map(_.get(data, "users"), "username", []);
  };

  let impersonate = function(impname) {
    console.log(impname);
    localStorage.setItem('imptk', impname);
    window.location.reload(false);
  }

  return (
    <Navbar bg="primary" variant="dark" expand="lg">
      <Container>
        <Navbar.Brand><FontAwesomeIcon icon={faRocket} size="lg"/> Coact</Navbar.Brand>
	<Navbar.Toggle onClick={function noRefCheck(){}} />
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav variant="pills" activeKey="1">
            <Nav.Item>
              <Nav.Link as={NavLink} to="/facilities">
                Facilities
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link as={NavLink} to="/repos">
                Repos
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link as={NavLink} to="/requests">
					      Requests
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link as={NavLink} to="/home">
					      Home
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </Navbar.Collapse>
        <Nav>
					<UserDropDown logged_in_user={logged_in_user} isAdmin={isAdmin} impersonate={setShow}/>
        </Nav>
        <Impersonate show={show} setShow={setShow} usernames={usernames} impersonate={impersonate}/>
      </Container>
    </Navbar>
  );
}
