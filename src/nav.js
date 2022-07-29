import { Nav, Navbar, NavDropdown, Container } from 'react-bootstrap';
import { useQuery, gql } from "@apollo/client";
import { NavLink, Link } from "react-router-dom";
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRocket, faPerson, faPersonCircleQuestion } from '@fortawesome/free-solid-svg-icons'

const USER = gql`
query whoami{
  whoami {
    username
  }
}`;

function UserDropDown( props ) {
	console.log(props);
  // not logged int
  if( props.logged_in_user === undefined ){
	  return (
      <>
        <Nav.Item>
          <FontAwesomeIcon icon={faPersonCircleQuestion} size="2x" />
        </Nav.Item>
        <Nav.Item><a href="/login" class="nav-link active">Log in...</a></Nav.Item>
      </>
    )
	}
  // logged in
  else {
    return (
      <>
        <Nav.Item>
          <FontAwesomeIcon icon={faPerson} size="2x"/>
        </Nav.Item>
        <Nav.Item>
          <NavDropdown align="end" title={props.logged_in_user} id="nav-dropdown">              
            <NavDropdown.Item eventKey="4.1" as={Link} to="/home">Settings...</NavDropdown.Item>           
            <NavDropdown.Item eventKey="4.2">My Aliases...</NavDropdown.Item>
            <NavDropdown.Item eventKey="4.3">Impersonate...</NavDropdown.Item>
            <NavDropdown.Divider />
            <NavDropdown.Item href="https://vouch.slac.stanford.edu/logout">Log out...</NavDropdown.Item>
          </NavDropdown>
        </Nav.Item>
      </>
    )
  }
}

export default function TopNavBar( ) {
  let logged_in_user = undefined;
  const { loading, error, data } = useQuery(USER);
  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>
  if ( data !== undefined && data.hasOwnProperty("whoami") ) {
    logged_in_user = data["whoami"].username;
  };
  return (
    <Navbar bg="primary" variant="dark" expand="lg">
      <Container>
        <Navbar.Brand><FontAwesomeIcon icon={faRocket} size="lg"/> Coact</Navbar.Brand>
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
          </Nav>
        </Navbar.Collapse>        
        <Nav className='ms-auto' bg="primary" variant="dark">
          <UserDropDown logged_in_user={logged_in_user}/>
        </Nav>
      </Container>
    </Navbar>
  );
}
