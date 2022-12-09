import _ from "lodash";
import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from "react-router-dom";
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  useQuery,
  gql
} from "@apollo/client";
import LandingPage from "./landingpage";
import FakeLogin from "./fakelogin";
import TopNavBar from "./nav";
import Facilities from "./tabs/facilities";
import Facility from "./tabs/facility";
import RepoTabs from "./tabs/repostabs";
import RequestTypes from "./tabs/requesttypes";
import MyProfile from "./myprofile";
import RegisterUser from "./register";
import Repo from "./tabs/repo";
import Compute from "./tabs/compute";
import Storage from "./tabs/storage";
import Users from "./tabs/users";
import Groups from "./tabs/groups";
import ClustersTabs from "./tabs/clusterstabs";
import StorageTabs from "./tabs/storagetabs";
import ReposComputeListView from "./tabs/reposcompute";
import ReposStorageListView from "./tabs/reposstorage";
import ReposUsersListView from "./tabs/reposusers";
import ReposGroupsListView from "./tabs/reposgroups";
import './index.css';
import { Footer } from "./tabs/widgets";
import { Nav } from 'react-bootstrap';
import Tab from 'react-bootstrap/Tab';
import { Link, Outlet, useParams } from "react-router-dom";

const client = new ApolloClient({
  uri: process.env.REACT_APP_COACT_GRAPHQL_URI,
  cache: new InMemoryCache(),
  headers: { coactimp: localStorage.getItem('imptk') }
});

const container = document.getElementById('root');
const root = createRoot(container);

const HOMEDETAILS = gql`
query {
  amIRegistered {
    isRegistered
    isRegistrationPending
    eppn
    fullname
  }
}
`;

function App() {
  console.log("starting app....");
  const { loading, error, data } = useQuery(HOMEDETAILS, { errorPolicy: 'all'} );
  if (loading) return <p>Loading...</p>;
  // if (error) return <p>Error!</p>;
  console.log(data);
  let hasUserAcc = _.get(data, "amIRegistered.isRegistered", false);
  let eppn = _.get(data, "amIRegistered.eppn", null);
  let registrationPending = _.get(data, "amIRegistered.isRegistrationPending", false);
  let isRegistered = _.get(data, "amIRegistered.isRegistered", false);
  let fullname = _.get(data, "amIRegistered.fullname", "");

  return (
    <div id="mainContainer">
      <div className="header">
        <BrowserRouter>
        { hasUserAcc ? <TopNavBar/> : <div/> }
        <Routes>
          <Route exact path="/" element={ hasUserAcc ? <Navigate to="myprofile" /> : <LandingPage/> } />
          <Route exact path="/login" element={ hasUserAcc ? <Navigate to="../myprofile" /> : <Navigate to="../register" /> } />
          <Route exact path="register" element={<RegisterUser eppn={eppn} isRegistered={isRegistered} registrationPending={registrationPending} fullname={fullname}/>}/>
          <Route exact path="facilities" element={<Facilities />}/>
          <Route exact path="facilities/:facilityname" element={<Facility />}/>
          <Route exact path="myprofile" element={<MyProfile />}/>
          <Route exact path="requests" element={<RequestTypes/>}/>
          <Route exact path="repousage/:reponame/compute/:allocationid" element={<Compute />} />
          <Route exact path="repousage/:reponame/storage/:allocationid" element={<Storage />} />
          <Route exact path="clusterusage/:clustername" element={<ClustersTabs />} />
          <Route exact path="storageusage/:storagename" element={<StorageTabs />} />
          <Route exact path="storageusage/:storagename/purpose/:purpose" element={<StorageTabs />} />
          <Route exact path="repos" element={<RepoTabs />}>
            <Route exact path={`compute`} element={ <ReposComputeListView/> }/>
            <Route exact path={`compute/:name/allocation/:allocationid`} element={ <Compute/> }/>
            <Route exact path={`storage`} element={ <ReposStorageListView/> } />
            <Route exact path={`storage/:name/allocation/:allocationid`} element={ <Storage/> }/>
            <Route exact path={`users`} element = { <ReposUsersListView/>} />
            <Route exact path={`users/:name`} element = { <Users />} />
            <Route exact path={`groups`} element = { <ReposGroupsListView/> } />
            <Route exact path={`groups/:name`} element = { <Groups /> } />
          </Route>
        </Routes>
        </BrowserRouter>
      </div>
      <Footer/>
    </div>
  );
}


root.render(
  <ApolloProvider client={client}>
    <App/>
  </ApolloProvider>
);
