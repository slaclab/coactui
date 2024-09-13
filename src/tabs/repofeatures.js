import _ from "lodash";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, gql } from "@apollo/client";
import React, { Component, useState } from 'react';
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';


const REPOFEATURES = gql`
query repoFeatures($repo: String!, $facility: String!){
  repo(filter: { name: $repo, facility: $facility }) {
    name
    facility
    features
  }
  whoami {
    username
  }
  __schema {
    types {
      name 
      enumValues {
        name
        description
      }
    }
  }    
}`;

const UPDATE_FEATURE_MUTATION = gql`
mutation repoUpdateFeatures($reposinput: RepoInput!, $features: [RepoFeatureEnum!]!){
  repoUpdateFeatures(repo: $reposinput, features: $features){
    name
    features
  }
}
`;


class RepoFeaturesTable extends Component {
  constructor(props) {
    super(props);
    this.state = { enabledFeatures: _.get(props.repo, "features", []), isError: false, errMsg: "" }
    this.toggleFeature = function(featurename, event) {
      const isChecked = event.target.checked;
      let newfeatures = this.state.enabledFeatures;
      if(isChecked) {
        newfeatures = _.union(newfeatures, [featurename])
      } else {
        newfeatures = _.without(newfeatures, featurename)
      }
      console.log(newfeatures);
      this.props.updateRepoFeature(newfeatures, () => { this.setState({ enabledFeatures: newfeatures, isError: false, errMsg: "" }) }, (error) => { console.log(error); this.setState({ isError: true, errMsg: error.message })  } );
    }
  }

  render() {
    return (
      <>
      <h5 className="text-center">Features for repo <span className="text-warning">{this.props.repo.name}</span> in facility <span className="text-warning">{this.props.repo.facility}</span></h5>
      <div className={this.state.isError ? "text-warning": "d-none"}>{this.state.errMsg}</div>      
      {
        _.map(this.props.repofeaturesenum, (ft) => { 
          const propval = _.get(this.props.repo, `features.${ft["name"]}`, {});
          return (
            <Card className="m-2" key={ft["name"]}>
              <Card.Body>
                <Card.Title>{ft["name"]}</Card.Title>
                <Card.Text as={"div"}>
                  <Form>
                    <Row>
                      <Col xs={6} className="fst-italic">{ft["description"]}</Col>
                      <Col xs={6}><Form.Check type="switch" id={ft["name"]} defaultChecked={_.includes(this.props.repo.features, ft["name"])} onChange={(ev) => { this.toggleFeature(ft["name"], ev) }}/></Col>
                    </Row>
                  </Form>
                </Card.Text>
              </Card.Body>
            </Card> 
          );
        })
      }
      </>
     )
  }
}

export default function RepoFeatures() {
  let params = useParams(), reponame = params.name, facilityname = params.facility;
  const { loading, error, data } = useQuery(REPOFEATURES, { variables: { repo: reponame, facility: facilityname } }, { fetchPolicy: 'no-cache', nextFetchPolicy: 'no-cache'});
  const [ updateFeatureMutation ] = useMutation(UPDATE_FEATURE_MUTATION);


  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :</p>;

  let username = _.get(data, "whoami.username");
  console.log(data);
  const repofeaturesenum = _.get(_.find(_.get(data, "__schema.types", []), ["name", "RepoFeatureEnum"]), "enumValues");
  console.log(repofeaturesenum);

  const updateRepoFeature = (features, onSuccess, onError) => {
    updateFeatureMutation({ variables: { reposinput: { name: reponame, facility: facilityname }, features: features }, refetchQueries: [ REPOFEATURES ], onCompleted: onSuccess, onError:  onError});
  }


  return (
    <>
    <RepoFeaturesTable repo={data.repo} repofeaturesenum={repofeaturesenum} updateRepoFeature={updateRepoFeature}/>
    </>
  );
}
