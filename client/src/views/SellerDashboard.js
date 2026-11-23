import React, { Component } from 'react';
import { Line, Bar } from "react-chartjs-2";
import LandContract from "../artifacts/Land.json";
import Land from "../artifacts/Land.json";
import getWeb3 from "../getWeb3";
import { DrizzleProvider } from 'drizzle-react';
import { Spinner  } from 'react-bootstrap';
import {  Link} from 'react-router-dom';
import {
  LoadingContainer,
  AccountData,
  ContractData,
  ContractForm
} from 'drizzle-react-components';

import viewImage from './viewImage';

// reactstrap components
import {
  Button,
  ButtonGroup,
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Input,
  Table,
  Row,
  Col,
  UncontrolledTooltip,
} from "reactstrap";

import "../card.css";
import "../index.css";

const drizzleOptions = {
  contracts: [Land]
}


var verified;
var row = [];
var countarr = [];
var userarr = [];
var reqsarr = [];

class SDash extends Component {
  constructor(props) {
    super(props)

    this.state = {
      LandInstance: undefined,
      account: null,
      web3: null,
      flag: null,
      verified: '',
      registered: '',
      count: 0,
      id: '',
    }
  }

  switchAccount = async () => {
    if (window.ethereum && window.ethereum.request) {
      try {
        await window.ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }]
        });
        window.location.reload();
      } catch (e) {
        console.warn(e);
      }
    } else {
      alert("Please switch accounts inside your MetaMask extension.");
    }
  };

  viewImage = (landId) => {
    alert(landId);
    this.props.history.push({
        pathname: '/viewImage',
      })
}

  componentDidMount = async () => {
    try {
      if (window.ethereum) {
        window.ethereum.on('accountsChanged', () => window.location.reload());
      }
      //Get network provider and web3 instance
      const web3 = await getWeb3();

      const accounts = await web3.eth.getAccounts();

      const networkId = await web3.eth.net.getId();
      const deployedNetwork = 
        Land.networks[networkId] || 
        Land.networks['5777'] || 
        Land.networks['1337'] || 
        Object.values(Land.networks || {})[0];

      if (!deployedNetwork || !deployedNetwork.address) {
        throw new Error("Smart contract address not found in build artifacts. Please deploy contracts to Ganache.");
      }

      const instance = new web3.eth.Contract(
        Land.abi,
        deployedNetwork.address,
      );

      const currentAddress = (accounts && accounts.length > 0) ? accounts[0] : (web3.currentProvider ? web3.currentProvider.selectedAddress : null);
      console.log(currentAddress);

      var verified = false;
      var registered = false;
      var isBuyer = false;
      var isInspector = false;
      if (sessionStorage.getItem('isSellerLoggedIn') === 'true') {
        registered = true;
        verified = true;
      } else if (currentAddress) {
        verified = await instance.methods.isVerified(currentAddress).call();
        registered = await instance.methods.isSeller(currentAddress).call();
        try {
          isBuyer = await instance.methods.isBuyer(currentAddress).call();
          isInspector = await instance.methods.isLandInspector(currentAddress).call();
        } catch (e) {
          console.warn(e);
        }
      }

      var count = await instance.methods.getLandsCount().call();
      count = parseInt(count);
      console.log(typeof (count));
      console.log(count);

      this.setState({ 
        LandInstance: instance, 
        web3: web3, 
        account: currentAddress,
        verified: verified,
        registered: registered,
        isBuyer: isBuyer,
        isInspector: isInspector
      });

      countarr = [];
      userarr = [];
      reqsarr = [];
      row = [];

      countarr.push(<ContractData contract="Land" method="getLandsCount" />);
      userarr.push(<ContractData contract="Land" method="getBuyersCount" />);
      reqsarr.push(<ContractData contract="Land" method="getRequestsCount" />);

      var rowsArea = [];
      var rowsCity = [];
      var rowsState = [];
      var rowsPrice = [];
      var rowsPID = [];
      var rowsSurvey = [];
      

      for (var i = 1; i < count + 1; i++) {
        rowsArea.push(<ContractData contract="Land" method="getArea" methodArgs={[i]} />);
        rowsCity.push(<ContractData contract="Land" method="getCity" methodArgs={[i]} />);
        rowsState.push(<ContractData contract="Land" method="getState" methodArgs={[i]} />);
        rowsPrice.push(<ContractData contract="Land" method="getPrice" methodArgs={[i]} />);
        rowsPID.push(<ContractData contract="Land" method="getPID" methodArgs={[i]} />);
        rowsSurvey.push(<ContractData contract="Land" method="getSurveyNumber" methodArgs={[i]} />);
      }
    

      for (var i = 0; i < count; i++) {
        row.push(<tr><td>{i + 1}</td><td>{rowsArea[i]}</td><td>{rowsCity[i]}</td><td>{rowsState[i]}</td><td>{rowsPrice[i]}</td><td>{rowsPID[i]}</td><td>{rowsSurvey[i]}</td>
        </tr>)

      }
      console.log(row);

    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };

  render() {
    if (!this.state.web3) {
      return (
        <div>
          <div>
            <h1>
              <Spinner animation="border" variant="primary" />
            </h1>
          </div>

        </div>
      );
    }

    if (!this.state.registered) {
      return (
        <div className="content">
          <Row className="justify-content-center" style={{ marginTop: '40px' }}>
            <Col md="8">
              <Card className="text-center" style={{ padding: '30px', borderRadius: '12px' }}>
                <CardBody>
                  <i className="fa fa-exclamation-triangle fa-4x text-warning" style={{ marginBottom: '15px' }}></i>
                  <h3 className="card-title" style={{ fontWeight: '600', marginTop: '10px' }}>
                    Seller Account Not Detected
                  </h3>
                  <p className="card-text text-muted" style={{ fontSize: '1rem', margin: '15px 0' }}>
                    Connected Wallet: <code style={{ color: '#e83e8c', background: '#f8f9fa', padding: '4px 8px', borderRadius: '4px' }}>{this.state.account || 'Not Connected'}</code>
                  </p>
                  {this.state.isBuyer && (
                    <div className="alert alert-warning" style={{ borderRadius: '8px', textAlign: 'left', margin: '20px auto', maxWidth: '600px', fontSize: '0.95rem' }}>
                      <strong>Role Conflict Detected:</strong> This wallet address is already registered on the blockchain as a <strong>Buyer</strong>. On Ethereum smart contracts, each role requires a unique account. To register or login as a Seller, please switch to <strong>Account 1</strong> in MetaMask.
                    </div>
                  )}
                  {this.state.isInspector && !this.state.isBuyer && (
                    <div className="alert alert-info" style={{ borderRadius: '8px', textAlign: 'left', margin: '20px auto', maxWidth: '600px', fontSize: '0.95rem' }}>
                      <strong>Admin Account:</strong> This wallet is the designated <strong>Land Inspector</strong>. To test Seller features, switch to <strong>Account 1</strong> in MetaMask.
                    </div>
                  )}
                  {!this.state.isBuyer && !this.state.isInspector && (
                    <p className="text-muted" style={{ fontSize: '1rem' }}>
                      This wallet address is not yet registered as a Seller on the blockchain.
                    </p>
                  )}
                  <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap' }}>
                    <Button onClick={this.switchAccount} color="warning" className="btn-round" style={{ fontWeight: 'bold' }}>
                      🦊 Switch Account in MetaMask
                    </Button>
                    {!this.state.isBuyer && (
                      <Button href="/RegisterSeller" color="primary" className="btn-round">
                        Register as Seller
                      </Button>
                    )}
                    <Button href="/login" color="secondary" className="btn-round" outline>
                      Back to Login
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </div>
      );
    }

    return (
      <>
        <div className="content">
          {!this.state.verified && (
            <Row>
              <Col xs="12">
                <div className="alert alert-info" style={{ borderRadius: '8px', padding: '15px 20px', marginBottom: '20px' }}>
                  <h5 style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>
                    <i className="fa fa-clock-o mr-2"></i> Seller Verification Pending
                  </h5>
                  <span>Your registration is saved on the blockchain. The Land Inspector (Tehsil Manager) will verify your documents shortly. Once verified, the "Add Land" and "Land Requests" buttons will activate.</span>
                </div>
              </Col>
            </Row>
          )}
        <DrizzleProvider options={drizzleOptions}>
            <LoadingContainer>
              <div className="main-section">
                <Row>
                  <Col lg="4">
                    <div class="dashbord dashbord-skyblue">
                      <div class="icon-section">
                        <i class="fa fa-users" aria-hidden="true"></i><br />
                        <medium>Total Buyers</medium><br />
                       <p> {userarr} </p>
                      </div>
                      <div class="detail-section"><br />
                      </div>
                    </div>
                  </Col>
                  <Col lg="4">
                    <div class="dashbord dashbord-orange">
                      <div class="icon-section">
                        <i class="fa fa-landmark" aria-hidden="true"></i><br />
                        <medium>Registered Lands Count</medium><br />
                        <p>{countarr}</p>
                      </div>
                      <div class="detail-section"><br />
                      </div>
                    </div>
                  </Col>
                  <Col lg="4">
                    <div class="dashbord dashbord-blue">
                      <div class="icon-section">
                        <i class="fa fa-bell" aria-hidden="true"></i><br />
                        <medium>Total Requests</medium><br />
                        <p>{reqsarr}</p>
                      </div>
                      <div class="detail-section">
                        <br />
                      </div>
                    </div>
                  </Col>
                </Row>
              </div>
            </LoadingContainer>
          </DrizzleProvider>
          <Row>
            <Col lg="4">
              <Card>
                <CardHeader>
                  <h5 className="title">Wish to Add Land !</h5>
                </CardHeader>
                <CardBody>
                  <div className="chart-area">

                    <Button href="/Seller/AddLand" disabled={!this.state.verified} className="btn-fill" color="primary">
                      Add Land
                </Button>
                  </div>
                </CardBody>
              </Card>
            </Col>
            <Col lg="4">
              <Card>
                <CardHeader>
                  <h5 className="title">Profile</h5>
                </CardHeader>
                <CardBody>
                  <div className="chart-area">

                    <Button href="/seller/sellerProfile" className="btn-fill" color="primary">
                      View Profile
                </Button>
                  </div>
                </CardBody>
              </Card>
            </Col>
            <Col lg="4">
              <Card>
                <CardHeader>
                  <h5 className="title">Requests</h5>
                </CardHeader>
                <CardBody>
                  <div className="chart-area">

                    <Button href="/Seller/ApproveRequest" disabled={!this.state.verified} className="btn-fill" color="primary">
                      View all Land Requests
                        </Button>
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>
         
          <DrizzleProvider options={drizzleOptions}>
            <LoadingContainer>
              <Row>
                <Col lg="12" md="12">
                  <Card>
                    <CardHeader>
                      <CardTitle tag="h4">Lands Info
                      </CardTitle>
                    </CardHeader>
                    <CardBody>
                      <Table className="tablesorter" responsive color="black">
                        <thead className="text-primary">
                          <tr>
                          <th>#</th>
                            <th>Area</th>
                            <th>City</th>
                            <th>State</th>
                            <th>Price</th>
                            <th>Property PID</th>
                            <th>Survey Number</th>
                          </tr>
                        </thead>
                        <tbody>
                          {row}
                        </tbody>
                      </Table>
                    </CardBody>
                  </Card>
                </Col>
              </Row>
            </LoadingContainer>
          </DrizzleProvider>
          <Row>
            <Col lg="4">
              <Card>
                <CardHeader>
                  <CardTitle>View Images of all Lands!</CardTitle>
                </CardHeader>
                <CardBody>
                    <Button href="/Seller/viewImage" className="btn-fill" color="primary">
                      View Images
                </Button>
                </CardBody>
              </Card>
            </Col>
            </Row>
        </div>
      </>

    );

  }
}

export default SDash;