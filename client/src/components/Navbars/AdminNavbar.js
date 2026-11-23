
import React from "react";
// nodejs library that concatenates classes
import classNames from "classnames";

// reactstrap components
import {
  Button,
  Collapse,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  UncontrolledDropdown,
  Input,
  InputGroup,
  NavbarBrand,
  Navbar,
  NavLink,
  Nav,
  Container,
  Modal,
  NavbarToggler,
  ModalHeader,
} from "reactstrap";

function AdminNavbar(props) {
  const [collapseOpen, setcollapseOpen] = React.useState(false);
  const [modalSearch, setmodalSearch] = React.useState(false);
  const [color, setcolor] = React.useState("navbar-transparent");
  const [account, setAccount] = React.useState(null);

  React.useEffect(() => {
    if (window.ethereum && window.ethereum.selectedAddress) {
      setAccount(window.ethereum.selectedAddress);
    }
  }, []);
  React.useEffect(() => {
    window.addEventListener("resize", updateColor);
    // Specify how to clean up after this effect:
    return function cleanup() {
      window.removeEventListener("resize", updateColor);
    };
  });
  // function that adds color white/transparent to the navbar on resize (this is for the collapse)
  const updateColor = () => {
    if (window.innerWidth < 993 && collapseOpen) {
      setcolor("bg-white");
    } else {
      setcolor("navbar-transparent");
    }
  };
  // this function opens and closes the collapse on small devices
  const toggleCollapse = () => {
    if (collapseOpen) {
      setcolor("navbar-transparent");
    } else {
      setcolor("bg-white");
    }
    setcollapseOpen(!collapseOpen);
  };
  // this function is to open the Search modal
  const toggleModalSearch = () => {
    setmodalSearch(!modalSearch);
  };
  return (
    <>
      <Navbar className={classNames("navbar-absolute", color)} expand="lg">
        <Container fluid>
          <div className="navbar-wrapper">
            <div
              className={classNames("navbar-toggle d-inline", {
                toggled: props.sidebarOpened,
              })}
            >
              <NavbarToggler onClick={props.toggleSidebar}>
                <span className="navbar-toggler-bar bar1" />
                <span className="navbar-toggler-bar bar2" />
                <span className="navbar-toggler-bar bar3" />
              </NavbarToggler>
            </div>
            {props.brandText && props.brandText !== "User Dashboard" ? (
              <NavbarBrand href="#pablo" onClick={(e) => e.preventDefault()}>
                {props.brandText}
              </NavbarBrand>
            ) : null}
          </div>
          <NavbarToggler onClick={toggleCollapse}>
            <span className="navbar-toggler-bar navbar-kebab" />
            <span className="navbar-toggler-bar navbar-kebab" />
            <span className="navbar-toggler-bar navbar-kebab" />
          </NavbarToggler>
          <Collapse navbar isOpen={collapseOpen}>
            <Nav className="ml-auto" navbar style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                padding: "5px 12px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: "700",
                color: "#059669"
              }}>
                <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#10b981", marginRight: "7px", display: "inline-block", boxShadow: "0 0 8px #10b981" }}></span>
                Ganache 1337
              </div>

              {account && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  padding: "5px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#334155"
                }}>
                  <span style={{ marginRight: "6px" }}>🦊</span>
                  <code>{account.substring(0, 6)}...{account.substring(account.length - 4)}</code>
                </div>
              )}

              <Button
                color="danger"
                size="sm"
                onClick={() => {
                  sessionStorage.removeItem('isAdminDefaultLoggedIn');
                  sessionStorage.removeItem('adminUser');
                  sessionStorage.removeItem('isSellerLoggedIn');
                  sessionStorage.removeItem('sellerUser');
                  sessionStorage.removeItem('isBuyerLoggedIn');
                  sessionStorage.removeItem('buyerUser');
                  window.location.href = '/';
                }}
                style={{
                  fontWeight: "bold",
                  borderRadius: "20px",
                  padding: "6px 14px",
                  margin: 0,
                  fontSize: "12px",
                  background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                  boxShadow: "0 4px 12px rgba(239, 68, 68, 0.25)",
                  border: "none"
                }}
              >
                <i className="fa fa-sign-out-alt" style={{ marginRight: "6px" }}></i>
                Logout
              </Button>
              
              <li className="separator d-lg-none" />
            </Nav>
          </Collapse>
        </Container>
      </Navbar>
      <Modal
        modalClassName="modal-search"
        isOpen={modalSearch}
        toggle={toggleModalSearch}
      >
        <ModalHeader>
          <Input placeholder="SEARCH" type="text" />
          <button
            aria-label="Close"
            className="close"
            onClick={toggleModalSearch}
          >
            <i className="tim-icons icon-simple-remove" />
          </button>
        </ModalHeader>
      </Modal>
    </>
  );
}

export default AdminNavbar;
