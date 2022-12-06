import Container from 'react-bootstrap/Container';
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGlobe, faRobot  } from '@fortawesome/free-solid-svg-icons'
import { Footer } from "./tabs/widgets";


export default function LandingPage() {
  return (<Container fluid id="landingpage">
    <div className="content">
      <Row>
        <Col>
          <Card>
            <Card.Body>
              <Card.Title>Register</Card.Title>
              <Card.Text>Register to use S3DF resources</Card.Text>
              <div><FontAwesomeIcon icon={faGlobe} size="6x" className="cardicn text-center"/></div>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card>
            <Card.Body>
              <Card.Title>Login</Card.Title>
              <Card.Text>Login to use Coact to manage your S3DF resources</Card.Text>
              <div><FontAwesomeIcon icon={faRobot} size="6x" className="cardicn text-center"/></div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
    <Footer/>
  </Container>);
}
