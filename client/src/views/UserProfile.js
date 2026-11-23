import React, { Component } from 'react';
import Land from "../artifacts/Land.json";
import getWeb3 from "../getWeb3";
import { Link } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Row,
  Col,
  Badge,
  Alert,
  Spinner,
} from "reactstrap";

class UserProfile extends Component {
  constructor(props) {
    super(props);
    this.state = {
      LandInstance: null,
      account: null,
      web3: null,
      loading: true,
      user: {
        name: '',
        age: '',
        city: '',
        aadharNumber: '',
        panNumber: '',
        document: '',
        email: '',
      },
      isRegistered: false,
      isVerified: false,
      isRejected: false,
      rejectionReason: '',
    };
  }

  componentDidMount = async () => {
    try {
      const web3 = await getWeb3();
      const accounts = await web3.eth.getAccounts();
      const currentAddress = (web3.currentProvider && web3.currentProvider.selectedAddress) || accounts[0];

      const networkId = await web3.eth.net.getId();
      const deployedNetwork =
        Land.networks[networkId] ||
        Land.networks['5777'] ||
        Land.networks['1337'] ||
        Object.values(Land.networks || {})[0];

      if (!deployedNetwork || !deployedNetwork.address) {
        throw new Error("Smart contract not found on current network.");
      }

      const instance = new web3.eth.Contract(Land.abi, deployedNetwork.address);

      let isRegistered = false;
      let isVerified = false;
      let isRejected = false;
      let rejectionReason = '';
      let userDetails = { name: '', age: '', city: '', aadharNumber: '', panNumber: '', document: '', email: '' };

      if (currentAddress) {
        isRegistered = await instance.methods.isRegistered(currentAddress).call();
        isVerified = await instance.methods.isVerified(currentAddress).call();
        isRejected = await instance.methods.isRejected(currentAddress).call();
        if (instance.methods.UserRejectionReason) {
          rejectionReason = await instance.methods.UserRejectionReason(currentAddress).call();
        }

        if (isRegistered) {
          const data = await instance.methods.getUserDetails(currentAddress).call();
          userDetails = {
            name: data[0] || 'User',
            age: data[1],
            city: data[2],
            aadharNumber: data[3],
            panNumber: data[4],
            document: data[5],
            email: data[6],
          };
        }
      }

      this.setState({
        web3,
        account: currentAddress,
        LandInstance: instance,
        loading: false,
        user: userDetails,
        isRegistered,
        isVerified,
        isRejected,
        rejectionReason,
      });

      if (window.ethereum) {
        window.ethereum.on('accountsChanged', () => window.location.reload());
      }
    } catch (err) {
      console.error("Profile mount error:", err);
      this.setState({ loading: false });
    }
  };

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

  render() {
    const { loading, account, user, isRegistered, isVerified, isRejected, rejectionReason } = this.state;

    if (loading) {
      return (
        <div className="content text-center" style={{ paddingTop: "120px" }}>
          <Spinner color="primary" style={{ width: "3rem", height: "3rem" }} />
          <h4 className="mt-3 text-muted">Loading Citizen Profile...</h4>
        </div>
      );
    }

    return (
      <div className="content">
        <Row>
          <Col md="12">
            <Card>
              <CardHeader>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <CardTitle tag="h3" style={{ fontWeight: "bold", margin: 0 }}>
                      👤 User Digital Profile
                    </CardTitle>
                  </div>
                  {isVerified ? (
                    <Badge color="success" style={{ fontSize: "13px", padding: "8px 14px", borderRadius: "20px" }}>
                      ✓ KYC VERIFIED
                    </Badge>
                  ) : isRejected ? (
                    <Badge color="danger" style={{ fontSize: "13px", padding: "8px 14px", borderRadius: "20px" }}>
                      ✗ REJECTED
                    </Badge>
                  ) : (
                    <Badge color="warning" style={{ fontSize: "13px", padding: "8px 14px", borderRadius: "20px" }}>
                      ⏳ PENDING VERIFICATION
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardBody>
                {!isRegistered ? (
                  <Alert color="warning">
                    This wallet is not yet registered. <Link to="/RegisterUser">Register as User</Link>
                  </Alert>
                ) : (
                  <div>
                    {/* Citizen Header Avatar & Identity */}
                    <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "28px", paddingBottom: "24px", borderBottom: "1px solid #f1f5f9" }}>
                      <div style={{
                        width: "68px",
                        height: "68px",
                        borderRadius: "20px",
                        background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ffffff",
                        fontSize: "26px",
                        fontWeight: 800,
                        boxShadow: "0 8px 20px rgba(59, 130, 246, 0.35)",
                        flexShrink: 0
                      }}>
                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <h3 style={{ margin: "0 0 6px 0", fontWeight: 800, color: "#0f172a", fontSize: "22px" }}>
                          {user.name || 'Registered User'}
                        </h3>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "13px", color: "#64748b" }}>
                            📍 {user.city || 'Location N/A'}
                          </span>
                          <span style={{ fontSize: "12px", color: "#cbd5e1" }}>•</span>
                          <span style={{ fontSize: "13px", color: "#64748b" }}>
                            🎂 {user.age ? `${user.age} Years Old` : 'Age N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Verified Attributes Grid */}
                    <Row>
                      <Col md="6" className="mb-3">
                        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px 18px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", display: "block", marginBottom: "6px" }}>
                            🆔 Aadhar Card Number
                          </span>
                          <code style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
                            {user.aadharNumber ? `${user.aadharNumber.substring(0, 4)}-${user.aadharNumber.substring(4, 8)}-${user.aadharNumber.substring(8)}` : 'N/A'}
                          </code>
                        </div>
                      </Col>

                      <Col md="6" className="mb-3">
                        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px 18px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", display: "block", marginBottom: "6px" }}>
                            💳 PAN Card Number
                          </span>
                          <code style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
                            {user.panNumber || 'N/A'}
                          </code>
                        </div>
                      </Col>
                    </Row>

                    <Row>
                      <Col md="6" className="mb-3">
                        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px 18px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", display: "block", marginBottom: "6px" }}>
                            🏙️ City / Residence
                          </span>
                          <span style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a" }}>
                            {user.city || 'N/A'}
                          </span>
                        </div>
                      </Col>

                      <Col md="6" className="mb-3">
                        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px 18px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", display: "block", marginBottom: "6px" }}>
                            ✉️ Email Address
                          </span>
                          <span style={{ fontSize: "15px", fontWeight: 600, color: "#0f172a" }}>
                            {user.email || 'N/A'}
                          </span>
                        </div>
                      </Col>
                    </Row>

                    <Row>
                      <Col md="12" className="mb-3">
                        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px 18px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", display: "block", marginBottom: "6px" }}>
                            🦊 Connected MetaMask Wallet Address
                          </span>
                          <code style={{ fontSize: "13.5px", fontWeight: 600, color: "#0f172a", wordBreak: "break-all" }}>
                            {account}
                          </code>
                        </div>
                      </Col>
                    </Row>

                    <div style={{ marginTop: "16px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                      <a
                        href={`/view-document?cid=${user.document || 'QmSampleBuyerDocHash'}&type=Citizen KYC Document&name=${encodeURIComponent(user.name)}&aadhar=${user.aadharNumber}&pan=${user.panNumber}&city=${encodeURIComponent(user.city)}&email=${encodeURIComponent(user.email)}&addr=${account}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-info"
                        style={{ fontWeight: "700", padding: "10px 20px", borderRadius: "10px" }}
                      >
                        📄 View KYC Proof Document
                      </a>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }
}

export default UserProfile;
