import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from 'react-bootstrap/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGlobe, faRobot  } from '@fortawesome/free-solid-svg-icons'

export default function LandingPage() {
  return (
    <div className="content">
      <Row>
        <Col>
          <Card className="text-center">
            <Card.Body>
              <div><FontAwesomeIcon icon={faGlobe} size="6x" className="cardicn text-center"/></div>
              <Card.Text>Register to use S3DF resources</Card.Text>
              <Button variant="primary" size="lg" href="/register">Register...</Button>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card className="text-center">
            <Card.Body>
              <div><FontAwesomeIcon icon={faRobot} size="6x" className="cardicn text-center"/></div>
              <Card.Text>Login to use Coact to manage your S3DF resources</Card.Text>
              <Button variant="secondary" size="lg" href="/login">Login...</Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
