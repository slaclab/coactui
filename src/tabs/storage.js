import React, { Component, useState } from 'react';
import Button from 'react-bootstrap/Button';
import { useParams } from "react-router-dom";
import { useQuery, useMutation, gql } from "@apollo/client";
import dayjs from "dayjs";
import Table from "react-bootstrap/Table";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Plot from "react-plotly.js";
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import { ChargeFactor, TwoPrecFloat } from "./widgets";
import _ from "lodash";

const REPODETAILS = gql`
query Repos($reposinput: RepoInput!, $allocationid: MongoId!, $datayear: Int!){
  repo(filter:$reposinput) {
    name
    facility
    storageAllocation(allocationid: $allocationid) {
      Id
      storagename
      purpose
      start
      end
      gigabytes
      inodes
      usage {
        gigabytes
        inodes
      }
      perDateUsage(year: $datayear) {
        date
        gigabytes
        inodes
      }
    }
  }
}
`;

const REPO_STORAGE_ALLOCATION_REQUEST = gql`
mutation repoStorageAllocationRequest($request: SDFRequestInput!){
  repoStorageAllocationRequest(request: $request){
    Id
  }
}
`;

class TopTab extends React.Component {
  constructor(props) {
    super(props);
    this.gigabytes_remaining_percent = (1.0 - this.props.repodata.storageAllocation.usage.gigabytes/this.props.repodata.storageAllocation.gigabytes)*100.0;
    this.inodes_remaining_percent = (1.0 - this.props.repodata.storageAllocation.usage.inodes/this.props.repodata.storageAllocation.inodes)*100.0;
  }
  render() {
    return (<Card>
              <Card.Body>
              <Table striped bordered>
                <tbody>
                  <tr>
                    <th><label>Repo</label></th>
                    <td>{this.props.repodata.name}</td>
                    <th><label>Purpose</label></th>
                    <td>{this.props.repodata.storageAllocation.purpose}</td>
                    <th><label>Storage Name</label></th>
                    <td>{this.props.repodata.storageAllocation.storagename}</td>
                  </tr>
                  <tr>
                    <th><label>Allocated (in GB)</label></th>
                    <td>{this.props.repodata.storageAllocation.gigabytes}</td>
                    <th><label>Used (in GB )</label></th>
                    <td>{this.props.repodata.storageAllocation.usage.gigabytes}</td>
                    <th><label>% remaining</label></th>
                    <td><TwoPrecFloat value={this.gigabytes_remaining_percent}/></td>
                  </tr>
                  <tr>
                    <th><label>Allocated files</label></th>
                    <td>{this.props.repodata.storageAllocation.inodes}</td>
                    <th><label>Used files</label></th>
                    <td>{this.props.repodata.storageAllocation.usage.inodes}</td>
                    <th><label>% remaining</label></th>
                    <td><TwoPrecFloat value={this.inodes_remaining_percent}/></td>
                  </tr>
                </tbody>
                </Table>
              </Card.Body>
            </Card>)
  }
}

class RequestAllocation extends Component {
  render() {
    const showMdl = () => { this.props.setShow(true); }
    return <Button variant="secondary" onClick={showMdl}>Request more storage</Button>
  }
}

class ChangeAllocationModal extends Component {
  constructor(props) {
    super(props);
    this.state = { gigabytesRequest: this.props.repodata.storageAllocation.gigabytes, gigabytesRequestInvalid: false, inodesRequest: this.props.repodata.storageAllocation.inodes, inodesRequestInvalid: false, notes: "" }
    this.handleClose = () => { this.props.setShow(false); }

    this.setGigabytesRequest = (event) => { this.setState({ gigabytesRequest: _.toNumber(event.target.value) }) }
    this.setInodesRequest = (event) => { this.setState({ inodesRequest: _.toNumber(event.target.value) }) }
    this.setnotes = (event) => { this.setState({ notes: event.target.value }) }

    this.changeAllocationRequest = () => {
      console.log(this.state);
      if(_.isNil(this.state.gigabytesRequest) || !_.isNumber(this.state.gigabytesRequest)) {
        this.setState({ gigabytesRequestInvalid: true });
        return;
      }
      console.log(this.state.inodesRequest);
      if(_.isNil(this.state.inodesRequest) || !_.isNumber(this.state.inodesRequest)) {
        this.setState({ inodesRequestInvalid: true });
        return;
      }
      this.props.requestChangeAllocation(this.state.gigabytesRequest, this.state.inodesRequest, this.state.notes);
      this.props.setShow(false);
    }
  }
  render() {
    return (
      <Modal show={this.props.show} onHide={this.handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Change storage allocation for {this.props.repodata.name} on storage volume {this.props.repodata.storageAllocation.storagename}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
            <Form.Text>Please enter the storage (in gigabytes) needed</Form.Text>
            <InputGroup hasValidation>
              <Form.Control type="number" value={this.state.gigabytesRequest} value={this.state.gigabytesRequest} onChange={this.setGigabytesRequest} isInvalid={this.state.gigabytesRequestInvalid}/>
              <Form.Control.Feedback type="invalid">Please enter a valid storage request (in gigabytes), for example, 1024.00</Form.Control.Feedback>
            </InputGroup>
            <Form.Text>Please enter the number of files (inodes) needed</Form.Text>
            <InputGroup hasValidation>
              <Form.Control type="number" value={this.state.inodesRequest} value={this.state.inodesRequest} onChange={this.setInodesRequest} isInvalid={this.state.inodesRequestInvalid}/>
              <Form.Control.Feedback type="invalid">Please enter a valid file request (in number of inodes), for example, 1000000</Form.Control.Feedback>
            </InputGroup>
            <Form.Text>Any additional comments</Form.Text>
            <Row className="mb-3">
              <InputGroup>
                <Form.Control as="textarea" rows={3} value={this.state.notes} placeholder="Please enter any additional comments" onChange={this.setnotes}/>
              </InputGroup>
            </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={this.handleClose}>
            Close
          </Button>
          <Button variant="primary" onClick={this.changeAllocationRequest}>
            Submit request
          </Button>
        </Modal.Footer>
      </Modal>
    )
  }
}

class StorageTab extends React.Component {
  constructor(props) {
    super(props);
    this.layout = { showlegend: false, yaxis: {range: [0, props.repodata.storageAllocation.gigabytes]}};
    let daily_storage_usage = { x: [], y: [], type: 'scatter', "name": "Storage Used", fill: 'tozeroy' };
    _.each(props.repodata.storageAllocation.perDateUsage, function(du){ daily_storage_usage.x.push(_.get(du, "date")); daily_storage_usage.y.push(_.get(du, "gigabytes"));})
    this.chartdata = [ daily_storage_usage ];
  }

  render() {
    return (<div className="container-fluid text-center tabcontainer">
      <Row>
        <ChangeAllocationModal show={this.props.allocMdlShow} setShow={this.props.setAllocMdlShow} repodata={this.props.repodata} requestChangeAllocation={this.props.requestChangeAllocation} />
        <Col md={3} className="mb-1"></Col>
        <Col className="my-2"><div className="sectiontitle">Resource usage for repo <span className="ref">{this.props.repodata.name}</span> on the <span className="ref">{this.props.repodata.storageAllocation.storagename}</span> storage volume used for <span className="ref">{this.props.repodata.storageAllocation.purpose}</span> </div></Col>
        <Col md={3} className="mb-1">
          <span className="float-end me-1">
            <RequestAllocation setShow={this.props.setAllocMdlShow}/>
          </span>
        </Col>
      </Row>
      <TopTab repodata={this.props.repodata}/>
      <Plot data={this.chartdata} layout={this.layout} style={{width: "100%", height: "100%"}} />
    </div>)
  }
}

export default function Storage() {
  let params = useParams(), reponame = params.reponame, allocationid = params.allocationid, datayear = dayjs().year();
  const { loading, error, data } = useQuery(REPODETAILS, { variables: { reposinput: { name: reponame }, allocationid: allocationid, datayear: datayear} });
  const [ repostgallocfn, { repostgallocdata, repostgallocloading, repostgallocerror }] = useMutation(REPO_STORAGE_ALLOCATION_REQUEST);

  const [ allocMdlShow, setAllocMdlShow] = useState(false);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :</p>;
  let repodata = data.repo;
  console.log(repodata);

  let requestChangeAllocation = function(newGigabytes, newInodes, notes) {
    console.log("Adding a request to change allocation to " + newGigabytes + "/" + newInodes);
    repostgallocfn({ variables: { request: { reqtype: "RepoStorageAllocation",
      reponame: repodata.name,
      allocationid: allocationid,
      purpose: repodata.storageAllocation.purpose,
      storagename: repodata.storageAllocation.storagename,
      gigabytes: _.toNumber(newGigabytes),
      inodes: _.toNumber(newInodes), notes: notes }}});
  }

  return (<StorageTab repodata={repodata} allocMdlShow={allocMdlShow} setAllocMdlShow={setAllocMdlShow} requestChangeAllocation={requestChangeAllocation}/>);
}
