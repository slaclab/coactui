import _ from "lodash";
import { NavLink, useParams } from "react-router-dom";
import { useQuery, useMutation, gql } from "@apollo/client";
import React, { Component, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { TwoPrecFloat, DateTimeDisp } from "./widgets";

const REPOAUDIT = gql`
query repoAuditTrails($repo: RepoInput!){
  repoAuditTrails(repo: $repo) {
    type
    name
    action
    actedby
    actedat
    details
  }
  whoami {
    username
  }
}`;

class AuditTable extends Component {
  constructor(props) {
    super(props);
  }
  render() {
    return (
      <>
      <div className="container-fluid text-center table-responsive">
        <table className="table table-condensed table-striped table-bordered">
          <thead>
            <tr><th>Action</th><th>By</th><th>At</th><th>Details</th></tr>
          </thead>
          <tbody>
          { _.map(this.props.audittrail, (a) => { return (<tr key={a.Id}><td>{a.action}</td><td>{a.actedby}</td><td><DateTimeDisp value={a.actedat}/></td><td>{a.details}</td></tr>) }) }
          </tbody>
          </table>
        </div>
      </>
     )
  }
}

export default function RepoAuditTrail() {
  let params = useParams(), reponame = params.name;
  const { loading, error, data } = useQuery(REPOAUDIT, { variables: { repo: { name: reponame } } }, { fetchPolicy: 'no-cache', nextFetchPolicy: 'no-cache'});

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :</p>;

  let username = _.get(data, "whoami.username");
  console.log(data);

  return (
    <>
    <AuditTable audittrail={data.repoAuditTrails} />
    </>
  );
}
