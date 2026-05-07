import React from 'react';
import ReactDOM from 'react-dom/client';
import { ApolloProvider } from '@apollo/client/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { store } from './app/store';
import { AuthProvider } from './features/auth/context/AuthContext';
import { RealtimeProvider } from './features/realtime/context/RealtimeContext';
import { apolloClient } from './shared/api/graphql';
import './App.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <ApolloProvider client={apolloClient}>
        <BrowserRouter>
          <AuthProvider>
            <RealtimeProvider>
              <App />
            </RealtimeProvider>
          </AuthProvider>
        </BrowserRouter>
      </ApolloProvider>
    </Provider>
  </React.StrictMode>,
);
