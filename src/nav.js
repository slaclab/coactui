import { Nav, Navbar, NavDropdown, Container } from 'react-bootstrap';
import { useQuery, gql } from "@apollo/client";

const USER = gql`
query whoami{
  whoami {
    username
  }
}`;

function logged_in( props ) {
  return(
     <NavDropdown title={props.logged_in_user} id="nav-dropdown">
       <NavDropdown.Item eventKey="4.1">Log Out...</NavDropdown.Item>
       <NavDropdown.Item eventKey="4.2">Impersonate...</NavDropdown.Item>
       <NavDropdown.Divider />
       <NavDropdown.Item eventKey="4.4">My Aliases...</NavDropdown.Item>
     </NavDropdown>
  );
}

function not_logged_in() {
  return(
		<NavDropdown title="Log in" id="nav-dropdown">
		</NavDropdown>
  )	 
}

function UserDropDown( props ) {
	console.log(props);
  if( props.logged_in_user === undefined ){
	  return not_logged_in();
	}
	return logged_in( props );
}

export default function TopNavBar( ) {
  let logged_in_user = undefined;
  //const { loading, error, data } = useQuery(USER);
  // logged_in_user = data.username;
  return (
    <Navbar bg="primary" expand="lg">
      <Container>
        <Navbar.Brand href="#home">Coact</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav variant="pills" activeKey="1">
            <Nav.Item>
              <Nav.Link eventKey="1" href="/faciliities">
               Facilities
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="2" href="/repos">
					      Repos
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="2" href="/home">
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

