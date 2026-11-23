import React, { Component } from 'react';
import LandContract from "./artifacts/Land.json";
import getWeb3 from "./getWeb3";
import { Link } from 'react-router-dom';
import {
  FormGroup,
  FormControl,
  Button,
  Spinner,
  Container,
  Row,
  Col,
  Card,
  Alert,
} from 'react-bootstrap';
import './index.css';

class RegisterUser extends Component {
  constructor(props) {
    super(props);

    this.state = {
      LandInstance: undefined,
      account: null,
      web3: null,
      name: '',
      age: '',
      city: '',
      email: '',
      aadharNumber: '',
      panNumber: '',
      buffer2: null,
      document: '',
      isAlreadyRegistered: false,
      isSubmitting: false,
    };
    this.captureDoc = this.captureDoc.bind(this);
  }

  componentDidMount = async () => {
    try {
      const web3 = await getWeb3();
      const accounts = await web3.eth.getAccounts();
      const networkId = await web3.eth.net.getId();

      const deployedNetwork =
        LandContract.networks[networkId] ||
        LandContract.networks['5777'] ||
        LandContract.networks['1337'] ||
        Object.values(LandContract.networks || {})[0];

      if (!deployedNetwork || !deployedNetwork.address) {
        throw new Error("Smart contract address not found in build artifacts.");
      }

      const instance = new web3.eth.Contract(
        LandContract.abi,
        deployedNetwork.address,
      );

      const currentAddress = (web3.currentProvider && web3.currentProvider.selectedAddress) || (accounts && accounts[0]);
      let isAlreadyRegistered = false;

      if (currentAddress) {
        try {
          isAlreadyRegistered = await instance.methods.isRegistered(currentAddress).call();
        } catch (e) {
          console.warn(e);
        }
      }

      this.setState({
        LandInstance: instance,
        web3: web3,
        account: currentAddress,
        isAlreadyRegistered: isAlreadyRegistered,
      });

      if (window.ethereum) {
        window.ethereum.on('accountsChanged', () => window.location.reload());
      }
    } catch (error) {
      console.error("RegisterUser error:", error);
      alert(`Failed to load web3, accounts, or contract.`);
    }
  };

  populateSampleData = () => {
    this.setState({
      name: 'Ramesh Sharma',
      age: '38',
      city: 'Pune',
      email: 'ramesh.sharma@example.com',
      aadharNumber: '987654321098',
      panNumber: 'ABCDE1234F',
      document: 'QmSampleUserKYCDoc',
    });
  };

  captureDoc(event) {
    event.preventDefault();
    const file = event.target.files[0];
    if (file) {
      const reader = new window.FileReader();
      reader.readAsArrayBuffer(file);
      reader.onloadend = () => {
        const docHash = 'QmKYCDoc' + Date.now();
        this.setState({ buffer2: Buffer(reader.result), document: docHash });

        const urlReader = new FileReader();
        urlReader.onload = (e) => {
          try {
            localStorage.setItem('ipfs_doc_' + docHash, e.target.result);
          } catch (storageErr) {
            console.warn(storageErr);
          }
        };
        urlReader.readAsDataURL(file);
      };
    }
  }

  registerUser = async (e) => {
    e && e.preventDefault();
    const { name, age, city, email, aadharNumber, panNumber, LandInstance, account, isAlreadyRegistered } = this.state;

    if (isAlreadyRegistered) {
      alert("This wallet address is already registered! Redirecting to User Dashboard.");
      this.props.history.push("/User/dashboard");
      return;
    }

    if (!name || !age || !city || !aadharNumber || !panNumber || !email) {
      alert("All fields are compulsory!");
      return;
    }

    if (!Number(aadharNumber) || aadharNumber.length !== 12) {
      alert("Aadhar Number must be exactly 12 digits!");
      return;
    }

    if (panNumber.length !== 10) {
      alert("PAN Number must be 10 characters long!");
      return;
    }

    if (!Number(age) || parseInt(age) < 18) {
      alert("Age must be 18 or older!");
      return;
    }

    const docHash = this.state.document || 'QmSampleUserKYCDoc';
    this.setState({ isSubmitting: true });

    try {
      await LandInstance.methods.registerUser(
        name,
        parseInt(age),
        city,
        aadharNumber,
        panNumber,
        docHash,
        email,
      ).send({
        from: account,
        gas: 2100000,
      });

      alert("✓ User account registered successfully on blockchain! You can now participate as both Buyer and Seller.");
      this.props.history.push("/User/dashboard");
    } catch (error) {
      console.error("User registration error:", error);
      alert("Registration failed: " + (error.message || error));
      this.setState({ isSubmitting: false });
    }
  };

  render() {
    const { web3, account, isAlreadyRegistered, isSubmitting } = this.state;

    if (!web3) {
      return (
        <div className="text-center" style={{ paddingTop: "120px" }}>
          <Spinner animation="border" variant="primary" />
          <h4 className="mt-3 text-muted">Connecting to Blockchain...</h4>
        </div>
      );
    }

    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", padding: "40px 0" }}>
        <Container>
          <Row className="justify-content-center">
            <Col md="8">
              <Card style={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 25px rgba(0,0,0,0.08)", overflow: "hidden" }}>
                <div style={{ backgroundColor: "#1e293b", padding: "28px 32px", color: "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h2 style={{ margin: 0, fontWeight: "bold", fontSize: "24px" }}>
                        👤 Citizen / User Blockchain Registration
                      </h2>
                      <p style={{ margin: "6px 0 0 0", color: "#94a3b8", fontSize: "14px" }}>
                        One account, one wallet — buy, sell, and register land seamlessly.
                      </p>
                    </div>
                    <Button variant="outline-light" size="sm" onClick={this.populateSampleData}>
                      ⚡ Sample Data
                    </Button>
                  </div>
                </div>

                <div style={{ padding: "32px" }}>
                  {isAlreadyRegistered && (
                    <Alert variant="info" style={{ borderRadius: "8px" }}>
                      ✓ This wallet address is already registered as a User!
                      <Link to="/User/dashboard" className="ml-2 font-weight-bold">
                        Go to User Dashboard →
                      </Link>
                    </Alert>
                  )}

                  <div style={{ backgroundColor: "#f1f5f9", padding: "12px 16px", borderRadius: "8px", marginBottom: "24px" }}>
                    <small className="text-muted d-block">Connecting Wallet Address:</small>
                    <code style={{ fontSize: "13px", color: "#0f172a" }}>{account || "No wallet detected"}</code>
                  </div>

                  <form onSubmit={this.registerUser}>
                    <Row>
                      <Col md="6">
                        <FormGroup>
                          <label style={{ fontSize: "13px", fontWeight: "bold", color: "#334155" }}>Full Name *</label>
                          <FormControl
                            type="text"
                            placeholder="e.g. Ramesh Sharma"
                            value={this.state.name}
                            onChange={(e) => this.setState({ name: e.target.value })}
                            required
                          />
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        <FormGroup>
                          <label style={{ fontSize: "13px", fontWeight: "bold", color: "#334155" }}>Age (18+) *</label>
                          <FormControl
                            type="number"
                            placeholder="e.g. 35"
                            value={this.state.age}
                            onChange={(e) => this.setState({ age: e.target.value })}
                            required
                          />
                        </FormGroup>
                      </Col>
                    </Row>

                    <Row>
                      <Col md="6">
                        <FormGroup>
                          <label style={{ fontSize: "13px", fontWeight: "bold", color: "#334155" }}>City / Taluka *</label>
                          <FormControl
                            type="text"
                            placeholder="e.g. Pune"
                            value={this.state.city}
                            onChange={(e) => this.setState({ city: e.target.value })}
                            required
                          />
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        <FormGroup>
                          <label style={{ fontSize: "13px", fontWeight: "bold", color: "#334155" }}>Email Address *</label>
                          <FormControl
                            type="email"
                            placeholder="e.g. user@example.com"
                            value={this.state.email}
                            onChange={(e) => this.setState({ email: e.target.value })}
                            required
                          />
                        </FormGroup>
                      </Col>
                    </Row>

                    <Row>
                      <Col md="6">
                        <FormGroup>
                          <label style={{ fontSize: "13px", fontWeight: "bold", color: "#334155" }}>Aadhar Number (12 Digits) *</label>
                          <FormControl
                            type="text"
                            maxLength="12"
                            placeholder="e.g. 987654321098"
                            value={this.state.aadharNumber}
                            onChange={(e) => this.setState({ aadharNumber: e.target.value })}
                            required
                          />
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        <FormGroup>
                          <label style={{ fontSize: "13px", fontWeight: "bold", color: "#334155" }}>PAN Card Number (10 Characters) *</label>
                          <FormControl
                            type="text"
                            maxLength="10"
                            placeholder="e.g. ABCDE1234F"
                            value={this.state.panNumber}
                            onChange={(e) => this.setState({ panNumber: e.target.value.toUpperCase() })}
                            required
                          />
                        </FormGroup>
                      </Col>
                    </Row>

                    <FormGroup>
                      <label style={{ fontSize: "13px", fontWeight: "bold", color: "#334155" }}>
                        Upload KYC Identity Document (Aadhar / PAN / Passport PDF or Image) *
                      </label>
                      <FormControl
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={this.captureDoc}
                      />
                      <small className="text-muted">
                        This document is reviewed by the Land Inspector before authorizing land transactions.
                      </small>
                    </FormGroup>

                    <div style={{ marginTop: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Link to="/" style={{ color: "#64748b", textDecoration: "none", fontSize: "14px" }}>
                        ← Back to Login
                      </Link>

                      <Button
                        variant="primary"
                        type="submit"
                        disabled={isSubmitting || isAlreadyRegistered}
                        style={{ padding: "10px 24px", fontWeight: "bold", borderRadius: "8px" }}
                      >
                        {isSubmitting ? "Registering on Blockchain..." : "✓ Complete Registration"}
                      </Button>
                    </div>
                  </form>
                </div>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }
}

export default RegisterUser;
