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
  ApolloProvider
} from "@apollo/client";
import TopNavBar from "./nav";
import Repos from "./tabs/repos";
import Repo from "./tabs/repo";
import Compute from "./tabs/compute";
import Storage from "./tabs/storage";
import Users from "./tabs/users";
import Groups from "./tabs/groups";
import 'bootstrap/dist/css/bootstrap.css';
import './index.css';

const client = new ApolloClient({
  uri: process.env.REACT_APP_COACT_GRAPHQL_URI,
  cache: new InMemoryCache()
});

const container = document.getElementById('root');
const root = createRoot(container);

function App() {
  return (
    <BrowserRouter>
    <TopNavBar/>
    <Routes>
      <Route exact path="/" element={ true ? <Navigate to="repos" /> : <Navigate to="facilities" />  } />
      <Route exact path="repos" element={<Repos />}/>
      <Route exact path="repos/:name" element={<Repo />}>
      <Route exact path="compute/:resourcename" element={<Compute />} />
      <Route exact path="storage/:resourcename" element={<Storage />} />
      <Route exact path="users/" element={<Users />} />
      <Route exact path="groups/" element={<Groups />} />
      </Route>
    </Routes>
    </BrowserRouter>
  );
}


root.render(
  <ApolloProvider client={client}>
    <App/>
  </ApolloProvider>
);


