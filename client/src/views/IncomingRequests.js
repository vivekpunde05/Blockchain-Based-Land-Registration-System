import React, { Component } from 'react';
import Land from "../artifacts/Land.json";
import getWeb3 from "../getWeb3";
import { Link } from 'react-router-dom';
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Table,
  Row,
  Col,
  Badge,
  Alert,
  Spinner,
} from "reactstrap";

class IncomingRequests extends Component {
  constructor(props) {
    super(props);
    this.state = {
      LandInstance: null,
      account: null,
      web3: null,
      loading: true,
      incomingRequests: [],
      txLoadingId: null,
      feedbackMessage: '',
      feedbackType: 'info',
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
      const totalReqs = parseInt(await instance.methods.getRequestsCount().call() || 0);
      let incomingRequests = [];

      for (let i = 1; i <= totalReqs; i++) {
        try {
          const req = await instance.methods.getRequestDetails(i).call();
          const sellerAddress = req[0];
          const buyerAddress = req[1];
          const landId = req[2];
          const isApproved = req[3];
          const isRej = instance.methods.isRequestRejected ? await instance.methods.isRequestRejected(i).call() : false;
          const isReqActive = await instance.methods.isRequested(i).call();

          if (currentAddress && sellerAddress && sellerAddress.toLowerCase() === currentAddress.toLowerCase() && isReqActive) {
            const price = await instance.methods.getPrice(landId).call();
            const survey = await instance.methods.getSurveyNumber(landId).call();
            const city = await instance.methods.getCity(landId).call();
            const isPaid = await instance.methods.isPaid(landId).call();

            incomingRequests.push({
              reqId: i,
              landId,
              buyerAddress,
              isApproved,
              isRej,
              isPaid,
              price,
              survey,
              city,
            });
          }
        } catch (e) {
          console.warn("Error fetching request:", i, e);
        }
      }

      this.setState({
        web3,
        account: currentAddress,
        LandInstance: instance,
        loading: false,
        incomingRequests,
      });

      if (window.ethereum) {
        window.ethereum.on('accountsChanged', () => window.location.reload());
      }
    } catch (err) {
      console.error("IncomingRequests mount error:", err);
      this.setState({ loading: false });
    }
  };

  handleApprove = async (reqId) => {
    const { LandInstance, account } = this.state;
    this.setState({ txLoadingId: reqId, feedbackMessage: '' });

    try {
      await LandInstance.methods.approveRequest(reqId).send({
        from: account,
        gas: 500000,
      });

      this.setState({
        txLoadingId: null,
        feedbackMessage: `✓ Purchase Request #${reqId} accepted! The buyer can now proceed with payment.`,
        feedbackType: 'success',
      });
      window.location.reload();
    } catch (err) {
      console.error(err);
      this.setState({
        txLoadingId: null,
        feedbackMessage: `Failed to accept request: ${err.message || err}`,
        feedbackType: 'danger',
      });
    }
  };

  handleReject = async (reqId) => {
    const { LandInstance, account } = this.state;
    this.setState({ txLoadingId: reqId, feedbackMessage: '' });

    try {
      await LandInstance.methods.rejectRequest(reqId).send({
        from: account,
        gas: 500000,
      });

      this.setState({
        txLoadingId: null,
        feedbackMessage: `✗ Purchase Request #${reqId} rejected.`,
        feedbackType: 'info',
      });
      window.location.reload();
    } catch (err) {
      console.error(err);
      this.setState({
        txLoadingId: null,
        feedbackMessage: `Failed to reject request: ${err.message || err}`,
        feedbackType: 'danger',
      });
    }
  };

  render() {
    const { loading, incomingRequests, txLoadingId, feedbackMessage, feedbackType } = this.state;

    if (loading) {
      return (
        <div className="content text-center" style={{ paddingTop: "120px" }}>
          <Spinner color="primary" style={{ width: "3rem", height: "3rem" }} />
          <h4 className="mt-3 text-muted">Loading Incoming Purchase Requests...</h4>
        </div>
      );
    }

    return (
      <div className="content">
        <Row>
          <Col md="12">
            <Card>
              <CardHeader>
                <CardTitle tag="h3" style={{ fontWeight: "bold", margin: 0 }}>
                  📥 Incoming Purchase Requests (Seller Action)
                </CardTitle>
              </CardHeader>

              <CardBody>
                {feedbackMessage && (
                  <Alert color={feedbackType} style={{ borderRadius: "8px" }}>
                    {feedbackMessage}
                  </Alert>
                )}

                {incomingRequests.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <i className="tim-icons icon-bell-55 text-muted" style={{ fontSize: "3.5rem" }} />
                    <h4 className="mt-3 font-weight-bold">No Incoming Requests</h4>
                    <p>You have not received any purchase requests for your listed properties yet.</p>
                  </div>
                ) : (
                  <Table responsive hover>
                    <thead className="text-primary">
                      <tr>
                        <th>Req #</th>
                        <th>Land ID</th>
                        <th>Property Details</th>
                        <th>Buyer Wallet</th>
                        <th>Asking Price</th>
                        <th>Current Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incomingRequests.map((req) => {
                        const isProcessing = txLoadingId === req.reqId;

                        return (
                          <tr key={req.reqId}>
                            <td><strong>#{req.reqId}</strong></td>
                            <td><strong>Land #{req.landId}</strong></td>
                            <td>Survey #{req.survey} in {req.city}</td>
                            <td>
                              <code>{req.buyerAddress.substring(0, 8)}...{req.buyerAddress.substring(36)}</code>
                            </td>
                            <td>
                              <strong>₹ {req.price}</strong>
                              <small className="text-muted d-block">
                                ~{(parseFloat(req.price) * 0.0000057).toFixed(5)} ETH
                              </small>
                            </td>
                            <td>
                              {req.isPaid ? (
                                <Badge color="success">✓ Paid & Title Transferred</Badge>
                              ) : req.isApproved ? (
                                <Badge color="info">✓ Accepted (Waiting for Buyer Payment)</Badge>
                              ) : req.isRej ? (
                                <Badge color="danger">✗ Rejected</Badge>
                              ) : (
                                <Badge color="warning">⏳ Pending Your Review</Badge>
                              )}
                            </td>
                            <td>
                              {!req.isApproved && !req.isRej && !req.isPaid ? (
                                <div style={{ display: "flex", gap: "8px" }}>
                                  <Button
                                    color="success"
                                    size="sm"
                                    disabled={isProcessing}
                                    onClick={() => this.handleApprove(req.reqId)}
                                    style={{ fontWeight: "bold", padding: "6px 12px" }}
                                  >
                                    {isProcessing ? "..." : "✓ Accept"}
                                  </Button>
                                  <Button
                                    color="danger"
                                    size="sm"
                                    disabled={isProcessing}
                                    onClick={() => this.handleReject(req.reqId)}
                                    style={{ fontWeight: "bold", padding: "6px 12px" }}
                                  >
                                    {isProcessing ? "..." : "✗ Reject"}
                                  </Button>
                                </div>
                              ) : req.isApproved && !req.isPaid ? (
                                <span className="text-muted" style={{ fontSize: "12px" }}>
                                  Awaiting payment from buyer
                                </span>
                              ) : (
                                <span className="text-muted" style={{ fontSize: "12px" }}>
                                  Completed / Closed
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }
}

export default IncomingRequests;
