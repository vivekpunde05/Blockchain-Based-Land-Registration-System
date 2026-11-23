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
    InputGroup,
    InputGroupAddon,
    InputGroupText,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    FormGroup,
    Label
} from "reactstrap";

class UserInfo extends Component {
    constructor(props) {
        super(props);

        this.state = {
            LandInstance: undefined,
            account: null,
            web3: null,
            verifiedAdmin: false,
            loading: true,
            usersList: [],
            searchQuery: '',
            filterStatus: 'all',
            rejectModalOpen: false,
            selectedUserForReject: null,
            rejectionReason: '',
            processingUser: null,
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

            let usersCount = 0;
            try {
                usersCount = await instance.methods.getUsersCount().call();
            } catch (e) {
                console.warn(e);
            }

            let userAddresses = [];
            try {
                userAddresses = await instance.methods.getUsers().call();
            } catch (e) {
                console.warn(e);
            }

            const usersList = [];
            for (let i = 0; i < userAddresses.length; i++) {
                const addr = userAddresses[i];
                try {
                    const details = await instance.methods.getUserDetails(addr).call();
                    const isVer = await instance.methods.isVerified(addr).call();
                    const isRej = await instance.methods.isRejected(addr).call();

                    usersList.push({
                        index: i + 1,
                        address: addr,
                        name: details[0] || 'Citizen',
                        age: details[1] || 'N/A',
                        city: details[2] || 'N/A',
                        aadhar: details[3] || 'N/A',
                        pan: details[4] || 'N/A',
                        document: details[5] || '',
                        email: details[6] || 'N/A',
                        verified: isVer,
                        rejected: isRej,
                    });
                } catch (err) {
                    console.warn("Error fetching user details at index", i, err);
                }
            }

            this.setState({
                LandInstance: instance,
                web3: web3,
                account: currentAddress,
                verifiedAdmin: verifiedAdmin,
                usersList: usersList,
                loading: false
            });

        } catch (error) {
            console.error("UserInfo mount error:", error);
            this.setState({ loading: false });
        }
    };

    handleVerifyUser = async (userAddress) => {
        const { LandInstance, account } = this.state;
        if (!LandInstance || !account) return;

        try {
            this.setState({ processingUser: userAddress });
            await LandInstance.methods.verifyUser(userAddress).send({
                from: account,
                gas: 2100000
            });
            window.location.reload();
        } catch (err) {
            console.error("Verify user error:", err);
            alert("Verification failed: Please verify you are connected to the Land Inspector wallet in MetaMask.");
            this.setState({ processingUser: null });
        }
    };

    openRejectModal = (user) => {
        this.setState({
            rejectModalOpen: true,
            selectedUserForReject: user,
            rejectionReason: 'Identity documents or details did not match government verification records.'
        });
    };

    closeRejectModal = () => {
        this.setState({
            rejectModalOpen: false,
            selectedUserForReject: null,
            rejectionReason: ''
        });
    };

    handleConfirmReject = async () => {
        const { LandInstance, account, selectedUserForReject, rejectionReason } = this.state;
        if (!LandInstance || !account || !selectedUserForReject) return;

        try {
            this.setState({ processingUser: selectedUserForReject.address, rejectModalOpen: false });
            await LandInstance.methods.rejectUser(selectedUserForReject.address, rejectionReason).send({
                from: account,
                gas: 2100000
            });
            window.location.reload();
        } catch (err) {
            console.error("Reject user error:", err);
            alert("Rejection failed: Please ensure you are connected to the Land Inspector wallet.");
            this.setState({ processingUser: null });
        }
    };

    render() {
        const { 
            loading, 
            verifiedAdmin, 
            usersList, 
            searchQuery, 
            filterStatus, 
            rejectModalOpen, 
            selectedUserForReject, 
            rejectionReason, 
            processingUser 
        } = this.state;

        if (loading) {
            return (
                <div className="content text-center" style={{ paddingTop: "100px" }}>
                    <Spinner animation="border" variant="primary" />
                    <p style={{ marginTop: "15px", color: "#aaa" }}>Loading Registered Citizens & Users...</p>
                </div>
            );
        }

        const filteredUsers = usersList.filter(user => {
            const matchesSearch = 
                user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.aadhar.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.pan.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.city.toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesSearch) return false;

            if (filterStatus === 'verified') return user.verified;
            if (filterStatus === 'pending') return !user.verified && !user.rejected;
            if (filterStatus === 'rejected') return user.rejected;
            return true;
        });

        const verifiedCount = usersList.filter(u => u.verified).length;
        const pendingCount = usersList.filter(u => !u.verified && !u.rejected).length;
        const rejectedCount = usersList.filter(u => u.rejected).length;

        return (
            <div className="content">
                {/* Header Stats Bar */}
                <Row style={{ marginBottom: "20px" }}>
                    <Col md="3">
                        <Card style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", boxShadow: "0 4px 16px -2px rgba(15, 23, 42, 0.05)" }}>
                            <CardBody style={{ padding: "18px" }}>
                                <div style={{ color: "#475569", fontSize: "11.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Users</div>
                                <div style={{ fontSize: "28px", fontWeight: "800", color: "#1d4ed8", marginTop: "4px" }}>{usersList.length}</div>
                            </CardBody>
                        </Card>
                    </Col>
                    <Col md="3">
                        <Card style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", boxShadow: "0 4px 16px -2px rgba(15, 23, 42, 0.05)" }}>
                            <CardBody style={{ padding: "18px" }}>
                                <div style={{ color: "#065f46", fontSize: "11.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>Verified Citizens</div>
                                <div style={{ fontSize: "28px", fontWeight: "800", color: "#059669", marginTop: "4px" }}>{verifiedCount}</div>
                            </CardBody>
                        </Card>
                    </Col>
                    <Col md="3">
                        <Card style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", boxShadow: "0 4px 16px -2px rgba(15, 23, 42, 0.05)" }}>
                            <CardBody style={{ padding: "18px" }}>
                                <div style={{ color: "#92400e", fontSize: "11.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>Pending Verification</div>
                                <div style={{ fontSize: "28px", fontWeight: "800", color: "#d97706", marginTop: "4px" }}>{pendingCount}</div>
                            </CardBody>
                        </Card>
                    </Col>
                    <Col md="3">
                        <Card style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", boxShadow: "0 4px 16px -2px rgba(15, 23, 42, 0.05)" }}>
                            <CardBody style={{ padding: "18px" }}>
                                <div style={{ color: "#991b1b", fontSize: "11.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>Rejected Profiles</div>
                                <div style={{ fontSize: "28px", fontWeight: "800", color: "#dc2626", marginTop: "4px" }}>{rejectedCount}</div>
                            </CardBody>
                        </Card>
                    </Col>
                </Row>

                {/* Main User Registry Card */}
                <Card>
                    <CardHeader style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px" }}>
                        <div>
                            <CardTitle tag="h4" style={{ margin: 0, fontWeight: "800", color: "#0f172a" }}>
                                👥 Unified Citizen & User Directory
                            </CardTitle>
                            <p style={{ color: "#475569", fontSize: "13.5px", margin: "4px 0 0" }}>
                                Single unified session for managing all citizens (buyers & sellers) on the blockchain.
                            </p>
                        </div>

                        {/* Search & Status Filter */}
                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                            <Input
                                type="text"
                                placeholder="🔍 Search name, wallet, Aadhar..."
                                value={searchQuery}
                                onChange={(e) => this.setState({ searchQuery: e.target.value })}
                                style={{ width: "260px", height: "38px", background: "#ffffff", color: "#0f172a", borderColor: "#cbd5e1", borderRadius: "8px", fontSize: "13px" }}
                            />
                            <div className="btn-group" role="group">
                                <Button
                                    size="sm"
                                    color={filterStatus === 'all' ? 'primary' : 'secondary'}
                                    onClick={() => this.setState({ filterStatus: 'all' })}
                                >
                                    All ({usersList.length})
                                </Button>
                                <Button
                                    size="sm"
                                    color={filterStatus === 'verified' ? 'success' : 'secondary'}
                                    onClick={() => this.setState({ filterStatus: 'verified' })}
                                >
                                    Verified ({verifiedCount})
                                </Button>
                                <Button
                                    size="sm"
                                    color={filterStatus === 'pending' ? 'warning' : 'secondary'}
                                    onClick={() => this.setState({ filterStatus: 'pending' })}
                                >
                                    Pending ({pendingCount})
                                </Button>
                                <Button
                                    size="sm"
                                    color={filterStatus === 'rejected' ? 'danger' : 'secondary'}
                                    onClick={() => this.setState({ filterStatus: 'rejected' })}
                                >
                                    Rejected ({rejectedCount})
                                </Button>
                            </div>
                        </div>
                    </CardHeader>

                    <CardBody>
                        {filteredUsers.length === 0 ? (
                            <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
                                <i className="fa fa-user-slash" style={{ fontSize: "36px", marginBottom: "12px", opacity: 0.6 }}></i>
                                <h5>No user profiles match the selected criteria</h5>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <Table className="tablesorter" style={{ verticalAlign: "middle" }}>
                                    <thead className="text-primary">
                                        <tr>
                                            <th>#</th>
                                            <th>Citizen Name</th>
                                            <th>Wallet Address</th>
                                            <th>Age / City</th>
                                            <th>Aadhar Number</th>
                                            <th>PAN Number</th>
                                            <th>KYC Document</th>
                                            <th>Verification Status</th>
                                            <th className="text-right">Admin Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.map((user) => (
                                             <tr key={user.address}>
                                                <td style={{ fontWeight: "bold", color: "#0f172a" }}>{user.index}</td>
                                                <td>
                                                    <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "14.5px" }}>{user.name}</div>
                                                    <div style={{ fontSize: "12px", color: "#475569" }}>{user.email}</div>
                                                </td>
                                                <td>
                                                    <code style={{ fontSize: "12px", color: "#1e293b", background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "4px 8px", borderRadius: "6px" }}>
                                                        {user.address.substring(0, 8)}...{user.address.substring(user.address.length - 6)}
                                                    </code>
                                                </td>
                                                <td>
                                                    <strong style={{ color: "#0f172a" }}>{user.age} yrs</strong><br />
                                                    <small style={{ color: "#475569", fontWeight: "500" }}>{user.city}</small>
                                                </td>
                                                <td style={{ letterSpacing: "1px", color: "#0f172a", fontWeight: "600" }}>{user.aadhar}</td>
                                                <td style={{ letterSpacing: "1px", color: "#0f172a", fontWeight: "600" }}>{user.pan}</td>
                                                <td>
                                                    {user.document ? (
                                                        <a 
                                                            href={`/view-document?cid=${user.document}&type=User&name=${encodeURIComponent(user.name)}&aadhar=${encodeURIComponent(user.aadhar)}&pan=${encodeURIComponent(user.pan)}&city=${encodeURIComponent(user.city)}&email=${encodeURIComponent(user.email)}&addr=${user.address}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn btn-outline-info btn-sm"
                                                            style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "6px" }}
                                                        >
                                                            <i className="fa fa-id-card" style={{ marginRight: "4px" }}></i> View KYC
                                                        </a>
                                                    ) : (
                                                        <span style={{ fontSize: "11px", color: "#64748b" }}>No Document</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {user.verified ? (
                                                        <Badge color="success" style={{ fontSize: "12px", padding: "6px 12px", borderRadius: "6px" }}>
                                                            ✓ Verified
                                                        </Badge>
                                                    ) : user.rejected ? (
                                                        <Badge color="danger" style={{ fontSize: "12px", padding: "6px 12px", borderRadius: "6px" }}>
                                                            ✕ Rejected
                                                        </Badge>
                                                    ) : (
                                                        <Badge color="warning" style={{ fontSize: "12px", padding: "6px 12px", borderRadius: "6px" }}>
                                                            ⏳ Pending Approval
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="text-right">
                                                    {user.verified ? (
                                                        <Button
                                                            size="sm"
                                                            color="danger"
                                                            outline
                                                            disabled={!verifiedAdmin || processingUser === user.address}
                                                            onClick={() => this.openRejectModal(user)}
                                                            style={{ fontSize: "11px", padding: "5px 10px" }}
                                                        >
                                                            Revoke
                                                        </Button>
                                                    ) : (
                                                        <div style={{ display: "inline-flex", gap: "6px" }}>
                                                            <Button
                                                                size="sm"
                                                                color="success"
                                                                disabled={!verifiedAdmin || processingUser === user.address}
                                                                onClick={() => this.handleVerifyUser(user.address)}
                                                                style={{ fontSize: "11px", padding: "5px 12px", fontWeight: "bold" }}
                                                            >
                                                                {processingUser === user.address ? "Processing..." : "✓ Approve"}
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                color="danger"
                                                                outline
                                                                disabled={!verifiedAdmin || processingUser === user.address}
                                                                onClick={() => this.openRejectModal(user)}
                                                                style={{ fontSize: "11px", padding: "5px 10px" }}
                                                            >
                                                                Reject
                                                            </Button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        )}
                    </CardBody>
                </Card>

                {/* Rejection Reason Modal */}
                <Modal isOpen={rejectModalOpen} toggle={this.closeRejectModal} style={{ color: "#000" }}>
                    <ModalHeader toggle={this.closeRejectModal}>
                        <strong>Reject Citizen Registration</strong>
                    </ModalHeader>
                    <ModalBody>
                        <p style={{ fontSize: "13px", color: "#475569" }}>
                            You are about to reject the identity verification for <strong>{selectedUserForReject && selectedUserForReject.name}</strong> ({selectedUserForReject && selectedUserForReject.address}).
                        </p>
                        <FormGroup>
                            <Label for="rejectReason" style={{ fontWeight: "bold" }}>Reason for Rejection:</Label>
                            <Input
                                type="textarea"
                                id="rejectReason"
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

export default UserInfo;
