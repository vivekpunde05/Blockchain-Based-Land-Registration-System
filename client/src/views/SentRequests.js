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

class SentRequests extends Component {
  constructor(props) {
    super(props);
    this.state = {
      LandInstance: null,
      account: null,
      web3: null,
      loading: true,
      sentRequests: [],
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
      let sentRequests = [];

      for (let i = 1; i <= totalReqs; i++) {
        try {
          const req = await instance.methods.getRequestDetails(i).call();
          const sellerAddress = req[0];
          const buyerAddress = req[1];
          const landId = req[2];
          const isApproved = req[3];
          const isRej = instance.methods.isRequestRejected ? await instance.methods.isRequestRejected(i).call() : false;
          const isReqActive = await instance.methods.isRequested(i).call();

          if (currentAddress && buyerAddress && buyerAddress.toLowerCase() === currentAddress.toLowerCase()) {
            const price = await instance.methods.getPrice(landId).call();
            const survey = await instance.methods.getSurveyNumber(landId).call();
            const city = await instance.methods.getCity(landId).call();
            const currentOwner = await instance.methods.getLandOwner(landId).call();
            const isPaid = await instance.methods.isPaid(landId).call();

            sentRequests.push({
              reqId: i,
              landId,
              sellerAddress,
              isApproved,
              isRej,
              isReqActive,
              isPaid,
              price,
              survey,
              city,
              currentOwner,
            });
          }
        } catch (e) {
          console.warn("Error fetching sent request:", i, e);
        }
      }

      this.setState({
        web3,
        account: currentAddress,
        LandInstance: instance,
        loading: false,
        sentRequests,
      });

      if (window.ethereum) {
        window.ethereum.on('accountsChanged', () => window.location.reload());
      }
    } catch (err) {
      console.error("SentRequests mount error:", err);
      this.setState({ loading: false });
    }
  };

  handlePay = async (req) => {
    const { LandInstance, account, web3 } = this.state;
    const ethPrice = (parseFloat(req.price) * 0.0000057).toFixed(6);
    const weiValue = web3.utils.toWei(ethPrice.toString(), "ether");

    if (!window.confirm(`Confirm payment of ${ethPrice} ETH (₹ ${req.price}) for Land #${req.landId}? Upon confirmation, ownership will transfer automatically to your wallet on the blockchain.`)) {
      return;
    }

    this.setState({ txLoadingId: req.reqId, feedbackMessage: '' });

    try {
      await LandInstance.methods.payment(req.sellerAddress, req.landId).send({
        from: account,
        value: weiValue,
        gas: 2500000,
      });

      this.setState({
        txLoadingId: null,
        feedbackMessage: `🎉 CONGRATULATIONS! Payment of ${ethPrice} ETH confirmed! Smart contract has automatically transferred Land #${req.landId} title deed to your wallet!`,
        feedbackType: 'success',
      });
      window.location.reload();
    } catch (err) {
      console.error("Payment error:", err);
      this.setState({
        txLoadingId: null,
        feedbackMessage: `Payment failed: ${err.message || err}`,
        feedbackType: 'danger',
      });
    }
  };

  handleCancelRequest = async (reqId) => {
    const { LandInstance, account } = this.state;
    this.setState({ txLoadingId: reqId, feedbackMessage: '' });

    try {
      await LandInstance.methods.cancelRequest(reqId).send({
        from: account,
        gas: 500000,
      });

      this.setState({
        txLoadingId: null,
        feedbackMessage: `✓ Purchase Request #${reqId} has been cancelled.`,
        feedbackType: 'info',
      });
      window.location.reload();
    } catch (err) {
      console.error(err);
      this.setState({
        txLoadingId: null,
        feedbackMessage: `Failed to cancel request: ${err.message || err}`,
        feedbackType: 'danger',
      });
    }
  };

  render() {
    const { loading, sentRequests, txLoadingId, feedbackMessage, feedbackType, account } = this.state;

    if (loading) {
      return (
        <div className="content text-center" style={{ paddingTop: "120px" }}>
          <Spinner color="primary" style={{ width: "3rem", height: "3rem" }} />
          <h4 className="mt-3 text-muted">Loading Your Sent Offers & Payments...</h4>
        </div>
      );
    }

    return (
      <div className="content">
        <Row>
          <Col md="12">
            <Card>
              <CardHeader>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <CardTitle tag="h3" style={{ fontWeight: "bold", margin: 0 }}>
                      💳 My Sent Offers & Title Deed Settlement
                    </CardTitle>
                  </div>
                  <Link to="/User/Marketplace" className="btn btn-outline-success btn-sm">
                    + Browse More Lands in Marketplace
                  </Link>
                </div>
              </CardHeader>

              <CardBody>
                {feedbackMessage && (
                  <Alert color={feedbackType} style={{ borderRadius: "8px", fontWeight: "bold" }}>
                    {feedbackMessage}
                  </Alert>
                )}

                {sentRequests.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <i className="tim-icons icon-money-coins text-muted" style={{ fontSize: "3.5rem" }} />
                    <h4 className="mt-3 font-weight-bold">No Sent Offers Yet</h4>
                    <p>Explore the Marketplace to find verified land parcels and submit purchase offers.</p>
                    <Link to="/User/Marketplace" className="btn btn-info mt-2">
                      Go to Marketplace
                    </Link>
                  </div>
                ) : (
                  <Table responsive hover>
                    <thead className="text-primary">
                      <tr>
                        <th>Req #</th>
                        <th>Land ID</th>
                        <th>Location</th>
                        <th>Seller Address</th>
                        <th>Agreed Price</th>
                        <th>Status</th>
                        <th>Payment & Title Settlement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sentRequests.map((req) => {
                        const isProcessing = txLoadingId === req.reqId;
                        const isOwnershipTransferred = account && req.currentOwner && req.currentOwner.toLowerCase() === account.toLowerCase();

                        return (
                          <tr key={req.reqId}>
                            <td><strong>#{req.reqId}</strong></td>
                            <td><strong>Land #{req.landId}</strong></td>
                            <td>Survey #{req.survey} in {req.city}</td>
                            <td>
                              <code>{req.sellerAddress.substring(0, 8)}...{req.sellerAddress.substring(36)}</code>
                            </td>
                            <td>
                              <strong style={{ color: "#27ae60" }}>₹ {req.price}</strong>
                              <small className="text-muted d-block">
                                ~{(parseFloat(req.price) * 0.0000057).toFixed(5)} ETH
                              </small>
                            </td>
                            <td>
                              {isOwnershipTransferred ? (
                                <Badge color="success" style={{ padding: "6px 10px" }}>
                                  👑 OWNED BY YOU (Title Transferred)
                                </Badge>
                              ) : !req.isReqActive ? (
                                <Badge color="secondary">Cancelled</Badge>
                              ) : req.isRej ? (
                                <Badge color="danger">✗ Declined by Seller</Badge>
                              ) : req.isApproved ? (
                                <Badge color="success">🎉 ACCEPTED BY SELLER</Badge>
                              ) : (
                                <Badge color="warning">⏳ Awaiting Seller Acceptance</Badge>
                              )}
                            </td>
                            <td>
                              {isOwnershipTransferred ? (
                                <Link to="/User/MyLands" className="btn btn-outline-success btn-sm">
                                  View in My Properties →
                                </Link>
                              ) : req.isApproved && req.isReqActive ? (
                                <Button
                                  color="success"
                                  size="sm"
                                  disabled={isProcessing}
                                  onClick={() => this.handlePay(req)}
                                  style={{ fontWeight: "bold", padding: "8px 16px", backgroundColor: "#27ae60", borderColor: "#27ae60" }}
                                >
                                  {isProcessing ? (
                                    <>
                                      <Spinner size="sm" /> Transferring Title...
                                    </>
                                  ) : (
                                    `⚡ Pay ${(parseFloat(req.price) * 0.0000057).toFixed(5)} ETH & Claim Title`
                                  )}
                                </Button>
                              ) : !req.isApproved && !req.isRej && req.isReqActive ? (
                                <Button
                                  color="secondary"
                                  outline
                                  size="sm"
                                  disabled={isProcessing}
                                  onClick={() => this.handleCancelRequest(req.reqId)}
                                  style={{ fontSize: "11px", padding: "5px 10px" }}
                                >
                                  {isProcessing ? "..." : "Cancel Request"}
                                </Button>
                              ) : (
                                <span className="text-muted" style={{ fontSize: "12px" }}>
                                  No action available
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

export default SentRequests;
