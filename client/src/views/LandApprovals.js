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

class LandApprovals extends Component {
    constructor(props) {
        super(props);

        this.state = {
            LandInstance: undefined,
            account: null,
            web3: null,
            verifiedAdmin: false,
            loading: true,
            landsList: [],
            searchQuery: '',
            filterTab: 'all', // all, pending, onSale, sold, rejected
            rejectModalOpen: false,
            selectedLandForReject: null,
            rejectionReason: '',
            processingLandId: null,
            inspectModalOpen: false,
            selectedLandForInspect: null,
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

            const totalLands = parseInt(await instance.methods.getLandsCount().call() || 0);
            const landsList = [];

            for (let i = 1; i <= totalLands; i++) {
                try {
                    const owner = await instance.methods.getLandOwner(i).call();
                    const area = await instance.methods.getArea(i).call();
                    const city = await instance.methods.getCity(i).call();
                    const stateLoc = await instance.methods.getState(i).call();
                    const price = await instance.methods.getPrice(i).call();
                    const pid = await instance.methods.getPID(i).call();
                    const survey = await instance.methods.getSurveyNumber(i).call();
                    const doc = await instance.methods.getDocument(i).call();
                    const isLandVerif = await instance.methods.isLandVerified(i).call();
                    const isLandRej = await instance.methods.isLandRejected(i).call();
                    const rejReason = await instance.methods.getLandRejectionReason(i).call();
                    const isOnSale = await instance.methods.isLandOnSale(i).call();
                    const isPaid = instance.methods.isPaid ? await instance.methods.isPaid(i).call() : false;

                    let ownerName = 'Registered Citizen';
                    let ownerEmail = '';
                    let ownerAadhar = '';
                    let ownerPan = '';
                    try {
                        const profile = await instance.methods.UserMapping(owner).call();
                        if (profile && profile.name) {
                            ownerName = profile.name;
                            ownerEmail = profile.email;
                            ownerAadhar = profile.aadharNumber;
                            ownerPan = profile.panNumber;
                        }
                    } catch (pe) {
                        // Ignore
                    }

                    landsList.push({
                        id: i,
                        owner,
                        ownerName,
                        ownerEmail,
                        ownerAadhar,
                        ownerPan,
                        area: parseInt(area) || 0,
                        city: city || 'N/A',
                        state: stateLoc || 'N/A',
                        price: parseInt(price) || 0,
                        pid: pid || 'N/A',
                        survey: survey || 'N/A',
                        doc,
                        isLandVerif,
                        isLandRej,
                        rejReason,
                        isOnSale,
                        isPaid,
                    });
                } catch (le) {
                    console.warn("Error loading land at id", i, le);
                }
            }

            this.setState({
                LandInstance: instance,
                web3: web3,
                account: currentAddress,
                verifiedAdmin: verifiedAdmin,
                landsList: landsList,
                loading: false
            });

        } catch (error) {
            console.error("LandApprovals mount error:", error);
            this.setState({ loading: false });
        }
    };

    handleAcceptLand = async (landId) => {
        const { LandInstance, account } = this.state;
        if (!LandInstance || !account) return;

        try {
            this.setState({ processingLandId: landId });
            await LandInstance.methods.verifyLand(landId).send({
                from: account,
                gas: 2100000
            });
            window.location.reload();
        } catch (err) {
            console.error("Verify land error:", err);
            alert("Approval failed: Please verify MetaMask is connected to the Land Inspector wallet.");
            this.setState({ processingLandId: null });
        }
    };

    openRejectModal = (land) => {
        this.setState({
            rejectModalOpen: true,
            selectedLandForReject: land,
            rejectionReason: 'Physical survey number or land boundary documents could not be legally verified with revenue department records.'
        });
    };

    closeRejectModal = () => {
        this.setState({
            rejectModalOpen: false,
            selectedLandForReject: null,
            rejectionReason: ''
        });
    };

    handleConfirmReject = async () => {
        const { LandInstance, account, selectedLandForReject, rejectionReason } = this.state;
        if (!LandInstance || !account || !selectedLandForReject) return;

        try {
            this.setState({ processingLandId: selectedLandForReject.id, rejectModalOpen: false });
            await LandInstance.methods.rejectLand(selectedLandForReject.id, rejectionReason).send({
                from: account,
                gas: 2100000
            });
            window.location.reload();
        } catch (err) {
            console.error("Reject land error:", err);
            alert("Rejection failed: Please ensure you are connected to the Land Inspector wallet.");
            this.setState({ processingLandId: null });
        }
    };

    openInspectModal = (land) => {
        this.setState({
            inspectModalOpen: true,
            selectedLandForInspect: land
        });
    };

    closeInspectModal = () => {
        this.setState({
            inspectModalOpen: false,
            selectedLandForInspect: null
        });
    };

    render() {
        const {
            loading,
            verifiedAdmin,
            landsList,
            searchQuery,
            filterTab,
            rejectModalOpen,
            selectedLandForReject,
            rejectionReason,
            processingLandId,
            inspectModalOpen,
            selectedLandForInspect
        } = this.state;

        if (loading) {
            return (
                <div className="content text-center" style={{ paddingTop: "100px" }}>
                    <Spinner animation="border" variant="primary" />
                    <p style={{ marginTop: "15px", color: "#aaa" }}>Loading Land Inspection Records...</p>
                </div>
            );
        }

        const pendingCount = landsList.filter(l => !l.isLandVerif && !l.isLandRej && !l.isPaid).length;
        const onSaleCount = landsList.filter(l => l.isLandVerif && l.isOnSale && !l.isPaid).length;
        const soldCount = landsList.filter(l => l.isPaid).length;
        const rejectedCount = landsList.filter(l => l.isLandRej).length;

        const filteredLands = landsList.filter(land => {
            const matchesSearch =
                land.id.toString().includes(searchQuery) ||
                land.survey.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
                land.pid.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
                land.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
                land.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
                land.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                land.owner.toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesSearch) return false;

            if (filterTab === 'pending') return !land.isLandVerif && !land.isLandRej && !land.isPaid;
            if (filterTab === 'onSale') return land.isLandVerif && land.isOnSale && !land.isPaid;
            if (filterTab === 'sold') return land.isPaid;
            if (filterTab === 'rejected') return land.isLandRej;
            return true;
        });

        return (
            <div className="content">
                {/* Metrics Bar */}
                <Row style={{ marginBottom: "20px" }}>
                    <Col md="3">
                        <Card style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", boxShadow: "0 4px 16px -2px rgba(15, 23, 42, 0.05)" }}>
                            <CardBody style={{ padding: "18px" }}>
                                <div style={{ color: "#475569", fontSize: "11.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Lands Registered</div>
                                <div style={{ fontSize: "28px", fontWeight: "800", color: "#4338ca", marginTop: "4px" }}>{landsList.length}</div>
                            </CardBody>
                        </Card>
                    </Col>
                    <Col md="3">
                        <Card style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", boxShadow: "0 4px 16px -2px rgba(15, 23, 42, 0.05)" }}>
                            <CardBody style={{ padding: "18px" }}>
                                <div style={{ color: "#92400e", fontSize: "11.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>Pending Legal Review</div>
                                <div style={{ fontSize: "28px", fontWeight: "800", color: "#d97706", marginTop: "4px" }}>{pendingCount}</div>
                            </CardBody>
                        </Card>
                    </Col>
                    <Col md="3">
                        <Card style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", boxShadow: "0 4px 16px -2px rgba(15, 23, 42, 0.05)" }}>
                            <CardBody style={{ padding: "18px" }}>
                                <div style={{ color: "#065f46", fontSize: "11.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>Legal & Active for Sale</div>
                                <div style={{ fontSize: "28px", fontWeight: "800", color: "#059669", marginTop: "4px" }}>{onSaleCount}</div>
                            </CardBody>
                        </Card>
                    </Col>
                    <Col md="3">
                        <Card style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", boxShadow: "0 4px 16px -2px rgba(15, 23, 42, 0.05)" }}>
                            <CardBody style={{ padding: "18px" }}>
                                <div style={{ color: "#075985", fontSize: "11.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>Sold & Transferred</div>
                                <div style={{ fontSize: "28px", fontWeight: "800", color: "#0284c7", marginTop: "4px" }}>{soldCount}</div>
                            </CardBody>
                        </Card>
                    </Col>
                </Row>

                {/* Main Land Table Card */}
                <Card>
                    <CardHeader style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px" }}>
                        <div>
                            <CardTitle tag="h4" style={{ margin: 0, fontWeight: "800", color: "#0f172a" }}>
                                🏛️ Land Legal Verification & Inspection Registry
                            </CardTitle>
                            <p style={{ color: "#475569", fontSize: "13.5px", margin: "4px 0 0" }}>
                                Review property identification, verify legal credentials, and approve or reject properties for public sale.
                            </p>
                        </div>

                        {/* Search & Tabs */}
                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                            <Input
                                type="text"
                                placeholder="🔍 Search survey, PID, location, owner..."
                                value={searchQuery}
                                onChange={(e) => this.setState({ searchQuery: e.target.value })}
                                style={{ width: "260px", height: "38px", background: "#ffffff", color: "#0f172a", borderColor: "#cbd5e1", borderRadius: "8px", fontSize: "13px" }}
                            />
                            <div className="btn-group" role="group">
                                <Button
                                    size="sm"
                                    color={filterTab === 'all' ? 'primary' : 'secondary'}
                                    onClick={() => this.setState({ filterTab: 'all' })}
                                >
                                    All ({landsList.length})
                                </Button>
                                <Button
                                    size="sm"
                                    color={filterTab === 'pending' ? 'warning' : 'secondary'}
                                    onClick={() => this.setState({ filterTab: 'pending' })}
                                >
                                    Pending Review ({pendingCount})
                                </Button>
                                <Button
                                    size="sm"
                                    color={filterTab === 'onSale' ? 'success' : 'secondary'}
                                    onClick={() => this.setState({ filterTab: 'onSale' })}
                                >
                                    On Sale ({onSaleCount})
                                </Button>
                                <Button
                                    size="sm"
                                    color={filterTab === 'sold' ? 'info' : 'secondary'}
                                    onClick={() => this.setState({ filterTab: 'sold' })}
                                >
                                    Sold ({soldCount})
                                </Button>
                                <Button
                                    size="sm"
                                    color={filterTab === 'rejected' ? 'danger' : 'secondary'}
                                    onClick={() => this.setState({ filterTab: 'rejected' })}
                                >
                                    Rejected ({rejectedCount})
                                </Button>
                            </div>
                        </div>
                    </CardHeader>

                    <CardBody>
                        {filteredLands.length === 0 ? (
                            <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
                                <i className="fa fa-folder-open" style={{ fontSize: "36px", marginBottom: "12px", opacity: 0.6 }}></i>
                                <h5>No land records found for this filter</h5>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <Table className="tablesorter" style={{ verticalAlign: "middle" }}>
                                    <thead className="text-primary">
                                        <tr>
                                            <th>Property ID</th>
                                            <th>Location & Area</th>
                                            <th>Survey No / PID</th>
                                            <th>Asking Price</th>
                                            <th>Registered Owner</th>
                                            <th>Legal Deed / Document</th>
                                            <th>Legal Status</th>
                                            <th className="text-right">Inspection Decision</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredLands.map((land) => (
                                            <tr key={land.id}>
                                                <td>
                                                    <span style={{ fontWeight: "800", color: "#2563eb", fontSize: "15px" }}>
                                                        #{land.id}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: "700", color: "#0f172a" }}>{land.city}, {land.state}</div>
                                                    <small style={{ color: "#475569" }}>{land.area.toLocaleString()} sq. ft</small>
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: "700", color: "#0f172a" }}>Survey: {land.survey}</div>
                                                    <small style={{ color: "#475569" }}>PID: {land.pid}</small>
                                                </td>
                                                <td>
                                                    <span style={{ fontWeight: "700", color: "#059669", fontSize: "14.5px" }}>
                                                        {land.price} ETH
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: "700", color: "#0f172a" }}>{land.ownerName}</div>
                                                    <code style={{ fontSize: "11px", color: "#1e293b", background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "3px 6px", borderRadius: "4px" }}>
                                                        {land.owner.substring(0, 6)}...{land.owner.substring(land.owner.length - 4)}
                                                    </code>
                                                </td>
                                                <td>
                                                    {land.doc ? (
                                                        <a
                                                            href={`/view-document?cid=${land.doc}&type=Land&pid=${land.pid}&survey=${land.survey}&city=${encodeURIComponent(land.city)}&area=${land.area}&price=${land.price}&owner=${land.owner}&ownerName=${encodeURIComponent(land.ownerName)}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn btn-outline-info btn-sm"
                                                            style={{ fontSize: "11px", padding: "4px 8px", borderRadius: "6px" }}
                                                        >
                                                            <i className="fa fa-file-contract" style={{ marginRight: "4px" }}></i> View Deed
                                                        </a>
                                                    ) : (
                                                        <span style={{ fontSize: "11px", color: "#64748b" }}>Pending Upload</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {land.isPaid ? (
                                                        <Badge color="info" style={{ fontSize: "11px", padding: "5px 10px", borderRadius: "6px" }}>
                                                            ✓ Sold & Transferred
                                                        </Badge>
                                                    ) : land.isLandVerif && land.isOnSale ? (
                                                        <Badge color="success" style={{ fontSize: "11px", padding: "5px 10px", borderRadius: "6px" }}>
                                                            ✓ Legal (Listed on Sale)
                                                        </Badge>
                                                    ) : land.isLandRej ? (
                                                        <div>
                                                            <Badge color="danger" style={{ fontSize: "11px", padding: "5px 10px", borderRadius: "6px" }}>
                                                                ✕ Rejected as Illegal
                                                            </Badge>
                                                            {land.rejReason && (
                                                                <div style={{ fontSize: "10px", color: "#f87171", marginTop: "2px", maxWidth: "160px" }}>
                                                                    {land.rejReason}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <Badge color="warning" style={{ fontSize: "11px", padding: "5px 10px", borderRadius: "6px" }}>
                                                            ⏳ Awaiting Legal Review
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="text-right">
                                                    <div style={{ display: "inline-flex", gap: "6px" }}>
                                                        <Button
                                                            size="sm"
                                                            color="secondary"
                                                            outline
                                                            onClick={() => this.openInspectModal(land)}
                                                            style={{ fontSize: "11px", padding: "5px 9px" }}
                                                        >
                                                            <i className="fa fa-eye"></i> Details
                                                        </Button>

                                                        {!land.isPaid && !land.isLandVerif && (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    color="success"
                                                                    disabled={!verifiedAdmin || processingLandId === land.id}
                                                                    onClick={() => this.handleAcceptLand(land.id)}
                                                                    style={{ fontSize: "11px", padding: "5px 10px", fontWeight: "bold" }}
                                                                >
                                                                    {processingLandId === land.id ? "Processing..." : "✓ Accept & List"}
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    color="danger"
                                                                    outline
                                                                    disabled={!verifiedAdmin || processingLandId === land.id}
                                                                    onClick={() => this.openRejectModal(land)}
                                                                    style={{ fontSize: "11px", padding: "5px 8px" }}
                                                                >
                                                                    Reject
                                                                </Button>
                                                            </>
                                                        )}

                                                        {land.isLandVerif && !land.isPaid && (
                                                            <Button
                                                                size="sm"
                                                                color="danger"
                                                                outline
                                                                disabled={!verifiedAdmin || processingLandId === land.id}
                                                                onClick={() => this.openRejectModal(land)}
                                                                style={{ fontSize: "11px", padding: "5px 8px" }}
                                                            >
                                                                Revoke
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        )}
                    </CardBody>
                </Card>

                {/* Inspect Details Modal */}
                {selectedLandForInspect && (
                    <Modal isOpen={inspectModalOpen} toggle={this.closeInspectModal} style={{ color: "#000" }} size="lg">
                        <ModalHeader toggle={this.closeInspectModal}>
                            <strong>Property #{selectedLandForInspect.id} Legal Identification File</strong>
                        </ModalHeader>
                        <ModalBody>
                            <Row>
                                <Col md="6">
                                    <h6 style={{ fontWeight: "bold", borderBottom: "1px solid #cbd5e1", paddingBottom: "6px" }}>Property Identification</h6>
                                    <p style={{ margin: "6px 0" }}><strong>Survey Number:</strong> {selectedLandForInspect.survey}</p>
                                    <p style={{ margin: "6px 0" }}><strong>Property PID:</strong> {selectedLandForInspect.pid}</p>
                                    <p style={{ margin: "6px 0" }}><strong>Location:</strong> {selectedLandForInspect.city}, {selectedLandForInspect.state}</p>
                                    <p style={{ margin: "6px 0" }}><strong>Area:</strong> {selectedLandForInspect.area.toLocaleString()} sq. ft</p>
                                    <p style={{ margin: "6px 0" }}><strong>Valuation / Asking Price:</strong> {selectedLandForInspect.price} ETH</p>
                                </Col>
                                <Col md="6">
                                    <h6 style={{ fontWeight: "bold", borderBottom: "1px solid #cbd5e1", paddingBottom: "6px" }}>Owner Credentials</h6>
                                    <p style={{ margin: "6px 0" }}><strong>Owner Name:</strong> {selectedLandForInspect.ownerName}</p>
                                    <p style={{ margin: "6px 0" }}><strong>Owner Wallet:</strong> <code>{selectedLandForInspect.owner}</code></p>
                                    <p style={{ margin: "6px 0" }}><strong>Aadhar Number:</strong> {selectedLandForInspect.ownerAadhar || 'Recorded on-chain'}</p>
                                    <p style={{ margin: "6px 0" }}><strong>PAN Number:</strong> {selectedLandForInspect.ownerPan || 'Recorded on-chain'}</p>
                                </Col>
                            </Row>
                            <hr />
                            <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                                <strong>Legal Document Verification Link:</strong><br />
                                {selectedLandForInspect.doc ? (
                                    <a
                                        href={`/view-document?cid=${selectedLandForInspect.doc}&type=Land&pid=${selectedLandForInspect.pid}&survey=${selectedLandForInspect.survey}&city=${encodeURIComponent(selectedLandForInspect.city)}&area=${selectedLandForInspect.area}&price=${selectedLandForInspect.price}&owner=${selectedLandForInspect.owner}&ownerName=${encodeURIComponent(selectedLandForInspect.ownerName)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-info btn-sm mt-2"
                                    >
                                        <i className="fa fa-external-link-alt mr-1"></i> Open & Inspect Supporting Documents
                                    </a>
                                ) : (
                                    <span className="text-muted">No document provided</span>
                                )}
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            {!selectedLandForInspect.isLandVerif && !selectedLandForInspect.isPaid && (
                                <Button
                                    color="success"
                                    onClick={() => {
                                        this.closeInspectModal();
                                        this.handleAcceptLand(selectedLandForInspect.id);
                                    }}
                                >
                                    ✓ Accept & Verify Legal Status
                                </Button>
                            )}
                            <Button color="secondary" onClick={this.closeInspectModal}>Close</Button>
                        </ModalFooter>
                    </Modal>
                )}

                {/* Reject Land Modal */}
                <Modal isOpen={rejectModalOpen} toggle={this.closeRejectModal} style={{ color: "#000" }}>
                    <ModalHeader toggle={this.closeRejectModal}>
                        <strong>Reject Property Registration #{selectedLandForReject && selectedLandForReject.id}</strong>
                    </ModalHeader>
                    <ModalBody>
                        <p style={{ fontSize: "13px", color: "#475569" }}>
                            Rejecting this land prevents it from being listed for public sale. Please enter the official legal rejection reason to be recorded on the blockchain.
                        </p>
                        <FormGroup>
                            <Label for="landRejectReason" style={{ fontWeight: "bold" }}>Official Rejection Reason:</Label>
                            <Input
                                type="textarea"
                                id="landRejectReason"
                                rows="3"
                                value={rejectionReason}
                                onChange={(e) => this.setState({ rejectionReason: e.target.value })}
                            />
                        </FormGroup>
                    </ModalBody>
                    <ModalFooter>
                        <Button color="secondary" onClick={this.closeRejectModal}>Cancel</Button>
                        <Button color="danger" onClick={this.handleConfirmReject}>Confirm Rejection</Button>
                    </ModalFooter>
                </Modal>
            </div>
        );
    }
}

export default LandApprovals;
