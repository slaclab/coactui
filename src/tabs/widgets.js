import _ from "lodash";
import dayjs from "dayjs";
import React from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Image from 'react-bootstrap/Image'
import InputGroup from 'react-bootstrap/InputGroup';
import Form from 'react-bootstrap/Form';
import SLACLogo from '../images/SLAC_primary_red.png';
import SLACShortLogo from '../images/SLAC_short_white.png';
import StanfordDOELogo from '../images/Stanford_DOE_black.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRocket, faPerson, faPersonCircleQuestion } from '@fortawesome/free-solid-svg-icons'




export function NodeSecs(props) {
  if(_.isNil(props.value)) return "N/A";
  return (props.value/3600).toFixed(2);
}

export function Percent(props) {
  if(_.isNil(props.value)) return "N/A";
  return props.value.toFixed(2);
}

export function ChargeFactor(props) {
  if(_.isNil(props.value)) return "N/A";
  return props.value.toFixed(2);
}

export function DateDisp(props) {
  if(_.isNil(props.value)) return "N/A";
  return dayjs(props.value).format('MMM D YYYY');
}

export function DateTimeDisp(props) {
  if(_.isNil(props.value)) return "N/A";
  return dayjs(props.value).format('MMM D YYYY HH:mm:ss');
}


// props 1) alloptions Array of strings with all possible choices. 2) selected - those that are currently selected. 3) onSelDesel - function to process selection/deselection.
export class SearchAndAdd extends React.Component {
  constructor(props) {
    super(props);
    this.state = { selected: this.props.selected, matches: [  ] }

    this.handleTyping = (event) => {
      let srchtxt = event.target.value;
      let matches = _.filter(this.props.alloptions, (x) => { return x.includes(srchtxt) } );
      this.setState({ matches: _.map(matches, (x) => { return {"label": x, "selected": _.includes(this.state.selected, x)}  }) });
    }

    this.checkUncheck = (event) => {
      let selkey = event.target.dataset.selkey;
      console.log(selkey + " has value " + event.target.checked);
      this.props.onSelDesel(selkey, event.target.checked);
      let newselected = event.target.checked ? _.union(this.state.selected, [selkey]) : _.without(this.state.selected, selkey);
      let newmatches = _.map(this.state.matches, (x) => { return {"label": x["label"], "selected": _.includes(newselected, x["label"])}  });
      this.setState({ selected: newselected, matches: newmatches});
    }
  }

  render() {
    return(
      <div className="table-responsive">
        <Form.Group className="mb-3">
          <Form.Label className="pe-2">{this.props.label}</Form.Label>
          <Form.Control type="text" placeholder={"Please type in a " + _.toLower(this.props.label)} onChange={this.handleTyping}/>
        </Form.Group>
        <table className="table table-condensed table-striped table-bordered">
          <thead><tr><th>{this.props.label}</th><th>Select</th></tr></thead>
          <tbody>{ _.map(this.state.matches, (u) => { return (<tr key={u.label}><td>{u.label}</td><td><input type="checkbox" data-selkey={u.label} checked={!!u.selected} onChange={this.checkUncheck}/></td></tr>) }) }</tbody>
        </table>
      </div>
    );
  }
}

export function NoNavHeader() { // Use for pages that do have a navbar on top.
  return (
     <div className="nonavheader">
        <a href="https://www.slac.stanford.edu" className="nslogo"><Image height={"50vh"} src={SLACShortLogo}/></a>
        <FontAwesomeIcon className="napplogo align-middle" icon={faRocket} size="lg"/> <span className="nsppname align-middle">Coact</span>
     </div>
  )
}

export function Footer() {
  return (
     <div className="footer">
      <Row>
        <Col><a href="https://www.slac.stanford.edu"><Image height={"50vh"} src={SLACLogo}/></a></Col>
        <Col><Image height={"50vh"} src={StanfordDOELogo} className="partner"/></Col>
      </Row>
     </div>
  )
}
