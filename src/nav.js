import _ from "lodash";
import { Nav, Navbar, NavDropdown, Dropdown, Modal, Form, Button, InputGroup } from 'react-bootstrap';
import { useQuery, gql } from "@apollo/client";
import { NavLink } from "react-router-dom";
import React, { Component, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRocket, faUser, faUserNinja, faPersonCircleQuestion, faCheck } from '@fortawesome/free-solid-svg-icons'
import { useNavigate } from 'react-router-dom';
import { submitOnEnter } from './tabs/widgets'


const USER = gql`
query whoami{
  whoami {
    username
    isAdmin
    isCzar
    isImpersonating
  }
  users {
    username
  }
}`;


    //; window.open("https://vouch.slac.stanford.edu/logout")}>Log Out..</NavDropdown.Item>
function logged_in( props ) {
  let isCzarOrAdmin = props.isAdmin || props.isCzar;
  return(
     <>
     <Nav.Item className="navtxt">
       <FontAwesomeIcon icon={props.isImpersonating ? faUserNinja : faUser} size="2x"/>
     </Nav.Item>
     <NavDropdown align="end" title={props.logged_in_user} id="nav-dropdown">
       <NavDropdown.Item href="https://vouch.slac.stanford.edu/logout">Log out...</NavDropdown.Item>
       <NavDropdown.Item className={props.isAdmin && !props.isImpersonating ? "" : "d-none"} onClick={props.impersonate}>Impersonate...</NavDropdown.Item>
       <NavDropdown.Item className={props.isImpersonating ? "" : "d-none"} onClick={props.stopImpersonation}>Stop impersonation</NavDropdown.Item>
       <NavDropdown.Item className={isCzarOrAdmin ? "" : "d-none"} onClick={props.toggleShowAllRepos}>{ props.showAllRepos ? ( <span><span className="pe-1">Show all repos </span><FontAwesomeIcon className="navtoggle" icon={faCheck}/></span> ) : (<span>Show all repos</span> )} </NavDropdown.Item>
       <NavDropdown.Divider />
       <NavDropdown.Item as="span" onClick={() => { props.gotomyprofile() }}>My Profile</NavDropdown.Item>
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

    this.setRef = (element) => {
      if(element != null) {
        setTimeout(() => {element.focus();}, 2);
      }
    }
  }

  render() {
    return (
      <Modal show={this.props.show} onHide={this.handleClose} onKeyPress={submitOnEnter(this.impersonate)}>
        <Modal.Header closeButton>
          <Modal.Title>Impersonate user</Modal.Title>
        </Modal.Header>
        <Modal.Body>Please select the user to impersonate
          <InputGroup hasValidation>
            <Form.Control autoFocus ref={this.setRef} type="text" placeholder="Please select the user to impersonate" onChange={this.setImpName} isInvalid={this.state.impnameInvalid}/>
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
      <Nav.Item className="navtxt">
         <FontAwesomeIcon icon={faPersonCircleQuestion} size="2x"/>
      </Nav.Item>
      <NavDropdown align="end" title="Log in..." id="nav-dropdown" disabled="true">
      </NavDropdown>
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

export default function TopNavBar( props ) {
  let logged_in_user = undefined;
  let isImpersonating = false;
  let isAdmin = false;
  let isCzar = false;
  let showFacs = false;
  let usernames = [];
  const [show, setShow] = useState(false);
  const [showAllRepos, setShowAllRepos] = useState("true"==localStorage.getItem("showallrepos"));
  const { loading, error, data } = useQuery(USER);
  let navigate = useNavigate();
  let gotomyprofile = () => { navigate("/myprofile") }

  if (loading) return <p>Loading...</p>;
  console.log(data);
  if ( data !== undefined && data.hasOwnProperty("whoami") ) {
    logged_in_user = data["whoami"].username;
    isAdmin = data["whoami"].isAdmin;
    isCzar = data["whoami"].isCzar;
    showFacs = isAdmin || isCzar;
    usernames = _.map(_.get(data, "users"), "username", []);
    isImpersonating = data["whoami"].isImpersonating;
  };

  let impersonate = function(impname) {
    console.log(impname);
    localStorage.setItem('imptk', impname);
    window.location.reload(false);
  }

  let stopImpersonation = function(impname) {
    localStorage.removeItem('imptk');
    window.location.reload(false);
  }

  let toggleShowAllRepos = function() {
    let showAllRepos = _.isNil(localStorage.getItem("showallrepos")) ? "false" : localStorage.getItem("showallrepos");
    console.log("Current value of show all repos " + showAllRepos);
    localStorage.setItem("showallrepos", showAllRepos=="true" ? "false" : "true");
    console.log("Set show all repos to " + localStorage.getItem("showallrepos"));
    setShowAllRepos(localStorage.getItem("showallrepos") == "true");
    window.location.reload(false);
  }

  return (
    <Navbar bg="primary" variant="dark" expand="lg">
      <Navbar.Brand className="ps-2"  onClick={() => { navigate("/") }}><FontAwesomeIcon icon={faRocket} size="lg"/> Coact</Navbar.Brand>
<Navbar.Toggle onClick={function noRefCheck(){}} />
      <Navbar.Collapse id="basic-navbar-nav">
        <Nav variant="pills" activeKey="1">
          { showFacs ? <Nav.Item> <Nav.Link as={NavLink} to="/facilities"> Facilities </Nav.Link> </Nav.Item> : null }
          <Nav.Item>
            <Nav.Link as={NavLink} to="/repos/users" disabled={logged_in_user ? false : true} onClick={() => { props.setReposActiveTab("users"); }}>
              Repos
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link as={NavLink} to="/requests"  disabled={logged_in_user ? false : true}>
              Requests
            </Nav.Link>
          </Nav.Item>
        </Nav>
      </Navbar.Collapse>
      <Nav>
				<UserDropDown logged_in_user={logged_in_user} isAdmin={isAdmin} isCzar={isCzar}
          isImpersonating={isImpersonating} impersonate={setShow} stopImpersonation={stopImpersonation}
          showAllRepos={showAllRepos} toggleShowAllRepos={toggleShowAllRepos}
          gotomyprofile={gotomyprofile}/>
      </Nav>
      <Impersonate show={show} setShow={setShow} usernames={usernames} impersonate={impersonate}/>
    </Navbar>
  );
}
