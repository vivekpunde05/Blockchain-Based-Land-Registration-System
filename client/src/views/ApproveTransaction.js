import React, {Component} from 'react'
import Land from "../artifacts/Land.json"
import getWeb3 from "../getWeb3"
import '../index.css';
import '../../node_modules/bootstrap/dist/css/bootstrap.min.css';
import { DrizzleProvider } from 'drizzle-react';
import {Spinner} from 'react-bootstrap'

// reactstrap components
import {
    Button,
    ButtonGroup,
    Card,
    CardHeader,
    CardBody,
    CardTitle,
    DropdownToggle,
    DropdownMenu,
    DropdownItem,
    UncontrolledDropdown,
    Label,
    FormGroup,
    Input,
    Table,
    Row,
    Col,
    UncontrolledTooltip,
  } from "reactstrap";
  

import {
    LoadingContainer,
    AccountData,
    ContractData,
    ContractForm
} from 'drizzle-react-components'

const drizzleOptions = {
    contracts: [Land]
}

var requestTable = [];

class ApproveRequest extends Component {
    constructor(props){
        super(props)

        this.state = {
            LandInstance: undefined,
            account: null,
            web3: null,
            approved: '',
            verified: '',
        }
    }
    landTransfer = (landId, newOwner) => async () => {

        await this.state.LandInstance.methods.LandOwnershipTransfer(
            landId, newOwner
        ).send({
            from: this.state.account,
            gas: 2100000
        });
        //Reload
        // console.log(newOwner);
        // console.log(completed);
        // // this.setState({completed:false});
        // completed = false;
        // console.log(completed);

        window.location.reload(false);

    }

    componentDidMount = async () => {
        //For refreshing page only once
        if(!window.location.hash){
            window.location = window.location + '#loaded';
            window.location.reload();
        }

        try{
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

            const currentAddress = (await web3.currentProvider.selectedAddress) || accounts[0];
            console.log(currentAddress);
            
            var requestsCount = await instance.methods.getRequestsCount().call();
            console.log(requestsCount);
            var verified = false;
            if (sessionStorage.getItem('isAdminDefaultLoggedIn') === 'true') {
                verified = true;
            } else if (currentAddress) {
                verified = await instance.methods.isLandInspector(currentAddress).call();
            }
            this.setState({ verified: verified });

            for(let i = 1; i<requestsCount+1; i++){
                var request = await instance.methods.getRequestDetails(i).call();
                console.log(request);
                var isPaid = await instance.methods.isPaid(request[2]).call();
                console.log(isPaid);
                requestTable.push(<tr><td>{i}</td><td>{request[0]}</td><td>{request[1]}</td><td>{request[2]}</td><td>{request[3].toString()}</td>
                <td>
                    <Button onClick={this.landTransfer(i, request[1])} disabled={!isPaid} className="button-vote">
                        Approve Land Transfer
                </Button>
                </td></tr>)
            }

            this.setState({ 
                LandInstance: instance, 
                web3: web3, 
                account: currentAddress 
            });

        }catch (error) {
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

        if (!this.state.verified) {
            return (
              <div className="content">
                <div>
                  <h1>
                  You are not verified to view this page.
                  </h1>
                </div>
                
              </div>
            );
          }

        return (
            <div  className="content">
            <DrizzleProvider options={drizzleOptions}>
            <LoadingContainer>
            <Card>
                    <CardHeader>
                      <CardTitle tag="h4">Lands Tranfer Request Info</CardTitle>
                    </CardHeader>
                    <CardBody>
                    <Table className="tablesorter" responsive color="black">
                        <thead className="text-primary">
                            <tr>
                                <th>#</th>
                                <th>Seller ID</th>
                                <th>Buyer ID</th>
                                <th>Land ID</th>
                                <th>Request Status</th>
                                <th>Verify Transfer</th>

                            </tr>
                        </thead> 
                        <tbody>
                            {requestTable}
                        </tbody> 
                    </Table>
                </CardBody>
                </Card>
            </LoadingContainer>
            </DrizzleProvider>
            </div>
        );
        
    }
}

export default ApproveRequest;

