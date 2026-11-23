import React, { Component } from 'react';
import Land from "../artifacts/Land.json";
import getWeb3 from "../getWeb3";
import '../index.css';
import '../../node_modules/bootstrap/dist/css/bootstrap.min.css';
import { Spinner } from 'react-bootstrap';

// reactstrap components
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
    Input,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    FormGroup,
    Label
} from "reactstrap";

class TransactionInfo extends Component {
    constructor(props) {
        super(props);

        this.state = {
            LandInstance: undefined,
            account: null,
            web3: null,
            verifiedAdmin: false,
            loading: true,
            transactionsList: [],
            requestsList: [],
            activeTab: 'transactions', // 'transactions' or 'requests'
            searchQuery: '',
            processingTransfer: null,
            manualTransferModal: false,
            manualLandId: '',
            manualNewOwner: '',
        };
    }

    componentDidMount = async () => {
        try {
            if (window.ethereum) {
                window.ethereum.on('accountsChanged', () => window.location.reload());
            }

            const web3 = await getWeb3();
            const accounts = await web3.eth.getAccounts();
            const currentAddress = (accounts && accounts.length > 0)
                ? accounts[0]
                : (web3.currentProvider ? web3.currentProvider.selectedAddress : null);

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

            let verifiedAdmin = false;
            if (sessionStorage.getItem('isAdminDefaultLoggedIn') === 'true') {
                verifiedAdmin = true;
            } else if (currentAddress) {
                try {
                    verifiedAdmin = await instance.methods.isLandInspector(currentAddress).call();
                } catch (e) {
                    console.warn("Inspector check failed:", e);
                }
            }

            // 1. Fetch Transactions from on-chain ledger
            const txCount = parseInt(await instance.methods.getTransactionsCount().call() || 0);
            const transactionsList = [];

            for (let i = txCount; i >= 1; i--) {
                try {
                    const record = await instance.methods.getTransactionRecord(i).call();
                    const txId = record[0];
                    const landId = record[1];
                    const seller = record[2];
                    const buyer = record[3];
                    const amountWei = record[4];
                    const timestamp = parseInt(record[5]);

                    let sellerName = 'Seller';
                    let buyerName = 'Buyer';
                    try {
                        const sProfile = await instance.methods.UserMapping(seller).call();
                        if (sProfile && sProfile.name) sellerName = sProfile.name;
                        const bProfile = await instance.methods.UserMapping(buyer).call();
                        if (bProfile && bProfile.name) buyerName = bProfile.name;
                    } catch (pe) {
                        // Ignore
                    }

                    let amountEth = '0';
                    try {
                        amountEth = web3.utils.fromWei(amountWei.toString(), 'ether');
                    } catch (we) {
                        amountEth = amountWei.toString();
                    }

                    transactionsList.push({
                        txId: txId.toString(),
                        landId: landId.toString(),
                        seller,
                        sellerName,
                        buyer,
                        buyerName,
                        amount: amountEth,
                        timestamp: timestamp > 0 ? new Date(timestamp * 1000).toLocaleString() : 'Confirmed On-Chain',
                    });
                } catch (err) {
                    console.warn("Error fetching transaction at index", i, err);
                }
            }

            // 2. Fetch Purchase Requests across the system
            const reqCount = parseInt(await instance.methods.getRequestsCount().call() || 0);
            const requestsList = [];

            for (let i = reqCount; i >= 1; i--) {
                try {
                    const reqDetails = await instance.methods.getRequestDetails(i).call();
                    const isAppr = await instance.methods.isApproved(i).call();
                    const isRej = await instance.methods.isRequestRejected(i).call();
                    const isReqActive = await instance.methods.isRequested(i).call();

                    const seller = reqDetails[0];
                    const buyer = reqDetails[1];
                    const landId = reqDetails[2];

                    let sellerName = 'Seller';
                    let buyerName = 'Buyer';
                    try {
                        const sProfile = await instance.methods.UserMapping(seller).call();
                        if (sProfile && sProfile.name) sellerName = sProfile.name;
                        const bProfile = await instance.methods.UserMapping(buyer).call();
                        if (bProfile && bProfile.name) buyerName = bProfile.name;
                    } catch (pe) {
                        // Ignore
                    }

                    let isPaid = false;
                    try {
                        isPaid = await instance.methods.isPaid(landId).call();
                    } catch (paidErr) {
                        // Ignore
                    }

                    let currentOwner = '';
                    try {
                        currentOwner = await instance.methods.getLandOwner(landId).call();
                    } catch (ownerErr) {
                        // Ignore
                    }

                    requestsList.push({
                        reqId: i,
                        landId: landId.toString(),
                        seller,
                        sellerName,
                        buyer,
                        buyerName,
                        currentOwner,
                        isApproved: isAppr,
                        isRejected: isRej,
                        isActive: isReqActive,
                        isPaid: isPaid,
                    });
                } catch (re) {
                    console.warn("Error fetching request at index", i, re);
                }
            }

            this.setState({
                LandInstance: instance,
                web3: web3,
                account: currentAddress,
                verifiedAdmin: verifiedAdmin,
                transactionsList,
                requestsList,
                loading: false
            });

        } catch (error) {
            console.error("TransactionInfo mount error:", error);
            this.setState({ loading: false });
        }
    };

    handleLandOwnershipTransfer = async (landId, newOwner) => {
        const { LandInstance, account } = this.state;
        if (!LandInstance || !account) return;

        try {
            this.setState({ processingTransfer: landId });
            await LandInstance.methods.LandOwnershipTransfer(landId, newOwner).send({
                from: account,
                gas: 2100000
            });
            window.location.reload();
        } catch (err) {
            console.error("LandOwnershipTransfer error:", err);
            alert("Ownership transfer failed: Please ensure you are connected to the Land Inspector wallet.");
            this.setState({ processingTransfer: null });
        }
    };

    handleManualTransferSubmit = async () => {
        const { manualLandId, manualNewOwner } = this.state;
        if (!manualLandId || !manualNewOwner) {
            alert("Please fill in both Land ID and New Owner Wallet Address.");
            return;
        }
        this.setState({ manualTransferModal: false });
        await this.handleLandOwnershipTransfer(manualLandId, manualNewOwner);
    };

    render() {
        const {
            loading,
            verifiedAdmin,
            transactionsList,
            requestsList,
            activeTab,
            searchQuery,
            processingTransfer,
            manualTransferModal,
            manualLandId,
            manualNewOwner
        } = this.state;

        if (loading) {
            return (
                <div className="content text-center" style={{ paddingTop: "100px" }}>
                    <Spinner animation="border" variant="primary" />
                    <p style={{ marginTop: "15px", color: "#aaa" }}>Loading Transaction Ledger & Purchase Requests...</p>
                </div>
            );
        }

        const filteredTransactions = transactionsList.filter(tx => 
            tx.txId.includes(searchQuery) ||
            tx.landId.includes(searchQuery) ||
            tx.seller.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tx.buyer.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tx.sellerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tx.buyerName.toLowerCase().includes(searchQuery.toLowerCase())
        );

        const filteredRequests = requestsList.filter(req => 
            req.reqId.toString().includes(searchQuery) ||
            req.landId.includes(searchQuery) ||
            req.seller.toLowerCase().includes(searchQuery.toLowerCase()) ||
            req.buyer.toLowerCase().includes(searchQuery.toLowerCase()) ||
            req.sellerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            req.buyerName.toLowerCase().includes(searchQuery.toLowerCase())
        );

        return (
            <div className="content">
                {/* Stats Bar */}
                <Row style={{ marginBottom: "20px" }}>
                    <Col md="4">
                        <Card style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", boxShadow: "0 4px 16px -2px rgba(15, 23, 42, 0.05)" }}>
                            <CardBody style={{ padding: "18px" }}>
                                <div style={{ color: "#065f46", fontSize: "11.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>Completed Transactions</div>
                                <div style={{ fontSize: "28px", fontWeight: "800", color: "#059669", marginTop: "4px" }}>{transactionsList.length}</div>
                            </CardBody>
                        </Card>
                    </Col>
                    <Col md="4">
                        <Card style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", boxShadow: "0 4px 16px -2px rgba(15, 23, 42, 0.05)" }}>
                            <CardBody style={{ padding: "18px" }}>
                                <div style={{ color: "#475569", fontSize: "11.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Purchase Requests</div>
                                <div style={{ fontSize: "28px", fontWeight: "800", color: "#4338ca", marginTop: "4px" }}>{requestsList.length}</div>
                            </CardBody>
                        </Card>
                    </Col>
                    <Col md="4">
                        <Card style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", boxShadow: "0 4px 16px -2px rgba(15, 23, 42, 0.05)" }}>
                            <CardBody style={{ padding: "18px" }}>
                                <div style={{ color: "#92400e", fontSize: "11.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>Pending Deed Settlements</div>
                                <div style={{ fontSize: "28px", fontWeight: "800", color: "#d97706", marginTop: "4px" }}>
                                    {requestsList.filter(r => r.isApproved && !r.isPaid).length}
                                </div>
                            </CardBody>
                        </Card>
                    </Col>
                </Row>

                {/* Main Card */}
                <Card>
                    <CardHeader style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px" }}>
                        <div>
                            <CardTitle tag="h4" style={{ margin: 0, fontWeight: "800", color: "#0f172a" }}>
                                📜 Blockchain Transaction Ledger & Transfer Approvals
                            </CardTitle>
                            <p style={{ color: "#475569", fontSize: "13.5px", margin: "4px 0 0" }}>
                                View all immutable land sales recorded on the blockchain and inspect purchase requests.
                            </p>
                        </div>

                        {/* Controls */}
                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                            <Input
                                type="text"
                                placeholder="🔍 Search tx, land ID, wallet, name..."
                                value={searchQuery}
                                onChange={(e) => this.setState({ searchQuery: e.target.value })}
                                style={{ width: "260px", height: "38px", background: "#ffffff", color: "#0f172a", borderColor: "#cbd5e1", borderRadius: "8px", fontSize: "13px" }}
                            />
                            <div className="btn-group" role="group">
                                <Button
                                    size="sm"
                                    color={activeTab === 'transactions' ? 'primary' : 'secondary'}
                                    onClick={() => this.setState({ activeTab: 'transactions' })}
                                >
                                    <i className="fa fa-receipt mr-1"></i> All Transactions ({transactionsList.length})
                                </Button>
                                <Button
                                    size="sm"
                                    color={activeTab === 'requests' ? 'primary' : 'secondary'}
                                    onClick={() => this.setState({ activeTab: 'requests' })}
                                >
                                    <i className="fa fa-handshake mr-1"></i> Purchase Requests ({requestsList.length})
                                </Button>
                            </div>

                            {verifiedAdmin && (
                                <Button
                                    size="sm"
                                    color="success"
                                    outline
                                    onClick={() => this.setState({ manualTransferModal: true })}
                                    style={{ fontWeight: "bold" }}
                                >
                                    <i className="fa fa-signature mr-1"></i> Manual Deed Transfer
                                </Button>
                            )}
                        </div>
                    </CardHeader>

                    <CardBody>
                        {activeTab === 'transactions' ? (
                            filteredTransactions.length === 0 ? (
                                <div style={{ padding: "40px 20px", textAlign: "center", color: "#475569" }}>
                                    <i className="fa fa-receipt" style={{ fontSize: "36px", marginBottom: "12px", opacity: 0.6 }}></i>
                                    <h5 style={{ color: "#0f172a", fontWeight: "700" }}>No blockchain transactions recorded yet</h5>
                                    <p style={{ fontSize: "13px", color: "#64748b" }}>Completed land purchases via MetaMask will be permanently indexed here.</p>
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <Table className="tablesorter" style={{ verticalAlign: "middle" }}>
                                        <thead className="text-primary">
                                            <tr>
                                                <th>Tx #</th>
                                                <th>Property ID</th>
                                                <th>Seller (Previous Owner)</th>
                                                <th>Buyer (New Owner)</th>
                                                <th>Amount (ETH)</th>
                                                <th>Timestamp</th>
                                                <th className="text-right">Ledger Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredTransactions.map((tx) => (
                                                <tr key={tx.txId}>
                                                    <td style={{ fontWeight: "bold", color: "#1d4ed8" }}>#{tx.txId}</td>
                                                    <td>
                                                        <Badge color="info" style={{ fontSize: "12px", padding: "4px 8px" }}>
                                                            Land #{tx.landId}
                                                        </Badge>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontWeight: "700", color: "#0f172a" }}>{tx.sellerName}</div>
                                                        <code style={{ fontSize: "11px", color: "#1e293b", background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "3px 6px", borderRadius: "4px" }}>
                                                            {tx.seller.substring(0, 8)}...{tx.seller.substring(tx.seller.length - 6)}
                                                        </code>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontWeight: "700", color: "#0f172a" }}>{tx.buyerName}</div>
                                                        <code style={{ fontSize: "11px", color: "#1e293b", background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "3px 6px", borderRadius: "4px" }}>
                                                            {tx.buyer.substring(0, 8)}...{tx.buyer.substring(tx.buyer.length - 6)}
                                                        </code>
                                                    </td>
                                                    <td>
                                                        <span style={{ fontWeight: "bold", color: "#b45309", fontSize: "14px" }}>
                                                            {tx.amount} ETH
                                                        </span>
                                                    </td>
                                                    <td style={{ color: "#475569", fontSize: "12.5px", fontWeight: "500" }}>
                                                        {tx.timestamp}
                                                    </td>
                                                    <td className="text-right">
                                                        <Badge color="success" style={{ fontSize: "11px", padding: "6px 12px", borderRadius: "6px" }}>
                                                            ✓ Confirmed on Chain
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                            )
                        ) : (
                            filteredRequests.length === 0 ? (
                                <div style={{ padding: "40px 20px", textAlign: "center", color: "#475569" }}>
                                    <i className="fa fa-handshake-slash" style={{ fontSize: "36px", marginBottom: "12px", opacity: 0.6 }}></i>
                                    <h5 style={{ color: "#0f172a", fontWeight: "700" }}>No purchase requests found</h5>
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <Table className="tablesorter" style={{ verticalAlign: "middle" }}>
                                        <thead className="text-primary">
                                            <tr>
                                                <th>Req #</th>
                                                <th>Property ID</th>
                                                <th>Buyer (Requester)</th>
                                                <th>Seller (Owner)</th>
                                                <th>Seller Acceptance</th>
                                                <th>Payment Status</th>
                                                <th className="text-right">Inspector Override</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredRequests.map((req) => (
                                                <tr key={req.reqId}>
                                                    <td style={{ fontWeight: "bold" }}>#{req.reqId}</td>
                                                    <td>
                                                        <Badge color="info" style={{ fontSize: "12px" }}>
                                                            Land #{req.landId}
                                                        </Badge>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontWeight: "700", color: "#0f172a" }}>{req.buyerName}</div>
                                                        <code style={{ fontSize: "11px", color: "#1e293b", background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "3px 6px", borderRadius: "4px" }}>
                                                            {req.buyer.substring(0, 8)}...{req.buyer.substring(req.buyer.length - 6)}
                                                        </code>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontWeight: "700", color: "#0f172a" }}>{req.sellerName}</div>
                                                        <code style={{ fontSize: "11px", color: "#1e293b", background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "3px 6px", borderRadius: "4px" }}>
                                                            {req.seller.substring(0, 8)}...{req.seller.substring(req.seller.length - 6)}
                                                        </code>
                                                    </td>
                                                    <td>
                                                        {req.isApproved ? (
                                                            <Badge color="success" style={{ fontSize: "11px", padding: "5px 10px" }}>
                                                                ✓ Accepted by Seller
                                                            </Badge>
                                                        ) : req.isRejected ? (
                                                            <Badge color="danger" style={{ fontSize: "11px", padding: "5px 10px" }}>
                                                                ✕ Rejected by Seller
                                                            </Badge>
                                                        ) : (
                                                            <Badge color="warning" style={{ fontSize: "11px", padding: "5px 10px" }}>
                                                                ⏳ Awaiting Seller Acceptance
                                                            </Badge>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {req.isPaid ? (
                                                            <Badge color="success" style={{ fontSize: "11px", padding: "5px 10px" }}>
                                                                ✓ Paid & Transferred
                                                            </Badge>
                                                        ) : (
                                                            <Badge color="secondary" style={{ fontSize: "11px", padding: "5px 10px" }}>
                                                                Pending Payment
                                                            </Badge>
                                                        )}
                                                    </td>
                                                    <td className="text-right">
                                                        {req.isApproved && !req.isPaid && (
                                                            <Button
                                                                size="sm"
                                                                color="primary"
                                                                disabled={!verifiedAdmin || processingTransfer === req.landId}
                                                                onClick={() => this.handleLandOwnershipTransfer(req.landId, req.buyer)}
                                                                style={{ fontSize: "11px", padding: "5px 10px", fontWeight: "bold" }}
                                                            >
                                                                {processingTransfer === req.landId ? "Transferring..." : "Authorize Title Transfer"}
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                            )
                        )}
                    </CardBody>
                </Card>

                {/* Manual Transfer Modal */}
                <Modal isOpen={manualTransferModal} toggle={() => this.setState({ manualTransferModal: false })} style={{ color: "#000" }}>
                    <ModalHeader toggle={() => this.setState({ manualTransferModal: false })}>
                        <strong>Authorize Government Title Deed Transfer</strong>
                    </ModalHeader>
                    <ModalBody>
                        <p style={{ fontSize: "13px", color: "#475569" }}>
                            As Land Inspector, you can legally execute an on-chain ownership transfer for any registered property.
                        </p>
                        <FormGroup>
                            <Label for="tLandId" style={{ fontWeight: "bold" }}>Property ID #:</Label>
                            <Input
                                type="number"
                                id="tLandId"
                                placeholder="e.g. 1"
                                value={manualLandId}
                                onChange={(e) => this.setState({ manualLandId: e.target.value })}
                            />
                        </FormGroup>
                        <FormGroup>
                            <Label for="tNewOwner" style={{ fontWeight: "bold" }}>New Owner Wallet Address:</Label>
                            <Input
                                type="text"
                                id="tNewOwner"
                                placeholder="0x..."
                                value={manualNewOwner}
                                onChange={(e) => this.setState({ manualNewOwner: e.target.value })}
                            />
                        </FormGroup>
                    </ModalBody>
                    <ModalFooter>
                        <Button color="secondary" onClick={() => this.setState({ manualTransferModal: false })}>Cancel</Button>
                        <Button color="success" onClick={this.handleManualTransferSubmit}>Confirm & Sign On Blockchain</Button>
                    </ModalFooter>
                </Modal>
            </div>
        );
    }
}

export default TransactionInfo;
