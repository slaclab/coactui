import Container from 'react-bootstrap/Container';
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import { Nav, Navbar } from 'react-bootstrap';
import { NavLink } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRocket, faBuilding, faGlobe, faRobot, faBook, faPhoneVolume, faPeopleArrows } from '@fortawesome/free-solid-svg-icons'
import { Footer } from "./tabs/widgets";


export default function LandingPage() {
  return (<Container fluid id="landingpage">
    <Navbar bg="primary" variant="dark" expand="lg">
      <Navbar.Brand className="ps-2"><FontAwesomeIcon icon={faRocket} size="lg"/> Coact</Navbar.Brand>
      <Navbar.Toggle onClick={function noRefCheck(){}} />
      <Navbar.Collapse>
        <Nav variant="pills" activeKey="1">
          <Nav.Item><Nav.Link>Portal</Nav.Link></Nav.Item>
          <Nav.Item><Nav.Link>Notebooks</Nav.Link></Nav.Item>
          <Nav.Item><Nav.Link>API</Nav.Link></Nav.Item>
          <Nav.Item><Nav.Link>Documentation</Nav.Link></Nav.Item>
          <Nav.Item><Nav.Link>Support</Nav.Link></Nav.Item>
          <Nav.Item><Nav.Link>Community</Nav.Link></Nav.Item>
        </Nav>
      </Navbar.Collapse>
      <Nav>
        <Nav.Item className="justify-content-end"><Nav.Link as={NavLink} to="/login">Login</Nav.Link></Nav.Item>
      </Nav>
    </Navbar>
    <div className="content">
      <Row>
        <Col>
          <Card>
            <Card.Body>
              <Card.Title>Portal</Card.Title>
              <Card.Text>Manage your resource usage</Card.Text>
              <div><FontAwesomeIcon icon={faBuilding} size="6x" className="cardicn text-center"/></div>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card>
            <Card.Body>
              <Card.Title>Notebooks</Card.Title>
              <Card.Text>Process and analyze data using Jupyter notebooks</Card.Text>
              <div><FontAwesomeIcon icon={faGlobe} size="6x" className="cardicn text-center"/></div>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card>
            <Card.Body>
              <Card.Title>API</Card.Title>
              <Card.Text>Automate your workflows using our API</Card.Text>
              <div><FontAwesomeIcon icon={faRobot} size="6x" className="cardicn text-center"/></div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Row>
        <Col>
          <Card>
            <Card.Body>
              <Card.Title>Documentation</Card.Title>
              <Card.Text>Consult our online documentation</Card.Text>
              <div><FontAwesomeIcon icon={faBook} size="6x" className="cardicn text-center"/></div>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card>
            <Card.Body>
              <Card.Title>Support</Card.Title>
              <Card.Text>Reach out for support</Card.Text>
              <div><FontAwesomeIcon icon={faPhoneVolume} size="6x" className="cardicn text-center"/></div>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card>
            <Card.Body>
              <Card.Title>Community</Card.Title>
              <Card.Text>Interact with your peers in our forums.</Card.Text>
              <div><FontAwesomeIcon icon={faPeopleArrows} size="6x" className="cardicn text-center"/></div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
    <Footer/>
  </Container>);
}
