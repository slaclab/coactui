import { Nav, Navbar, NavDropdown, Container } from 'react-bootstrap';
import { useQuery, gql } from "@apollo/client";
import { NavLink } from "react-router-dom";
import React from 'react';

const USER = gql`
query whoami{
  whoami {
    username
  }
}`;


    //; window.open("https://vouch.slac.stanford.edu/logout")}>Log Out..</NavDropdown.Item>
function logged_in( props ) {
  return(
     <NavDropdown align="end" title={props.logged_in_user} id="nav-dropdown">
       <NavDropdown.Item href="https://vouch.slac.stanford.edu/logout">Log Out...</NavDropdown.Item>
       <NavDropdown.Item eventKey="4.2">Impersonate...</NavDropdown.Item>
       <NavDropdown.Divider />
       <NavDropdown.Item eventKey="4.4">My Aliases...</NavDropdown.Item>
     </NavDropdown>
  );
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
      <Nav.Item><a href="/login" class="nav-link active">Log in...</a></Nav.Item>
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
  const { loading, error, data } = useQuery(USER);
  if (loading) return <p>Loading...</p>;
  if ( data !== undefined && data.hasOwnProperty("whoami") ) { 
    logged_in_user = data["whoami"].username;
  };
  return (
    <Navbar bg="primary" expand="lg">
      <Container>
        <Navbar.Brand>🚀 Coact</Navbar.Brand>
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
              <Nav.Link as={NavLink} to="/home">
					      Home
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </Navbar.Collapse>
        <Nav>
					<UserDropDown logged_in_user={logged_in_user}/>
        </Nav>
      </Container>
    </Navbar>
  );
}

