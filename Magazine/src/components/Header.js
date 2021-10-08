import React from "react";
import { Grid, Text, Button } from "../elements";
import { getCookie, deleteCookie } from "../shared/Cookie";

import { useSelector, useDispatch } from "react-redux";
import { actionCreators as userActions } from "../redux/modules/user";

import { history } from "../redux/configureStore";
import { apiKey } from "../shared/firebase";

import NotiBadge from "./NotiBadge";
import PersonIcon from '@material-ui/icons/Person';
import LockOpenIcon from '@material-ui/icons/LockOpen';

const Header = (props) => {
  const dispatch = useDispatch();
  const is_login = useSelector((state) => state.user.is_login);

  const _session_key = `firebase:authUser:${apiKey}:[DEFAULT]`;

  const is_session = sessionStorage.getItem(_session_key)? true : false;
  
  console.log(is_session);

  if (is_login && is_session) {
    return (
      <React.Fragment>
        <Grid bg="#FFD600" is_flex padding="4px 16px">
          <Grid _onClick={()=>history.push("/")}>
          <Text margin="0px" size="24px" bold>
              매거진
            </Text>
          </Grid>

          <Grid is_flex width="200px">
          <Grid padding="5px 0 0 0" width="auto"><PersonIcon fontSize="large"/></Grid>
            
            
            <NotiBadge _onClick={() => {
              history.push("/noti");
            }}
            />
            <Grid padding="5px 0 0 0" width="auto"
              _onClick={() => {
                dispatch(userActions.logoutFB());
              }}
            ><LockOpenIcon fontSize="large"/></Grid>
          </Grid>
        </Grid>
      </React.Fragment>
    );
  }

  return (
    <React.Fragment>
      <Grid bg="#FFD600" is_flex padding="4px 16px">
      <Grid _onClick={history.push("/")} width="150%">
          <Text margin="0px" size="24px" bold>
            매거진
          </Text>
          </Grid>
        <Grid is_flex>
          <Button bg="#FFD600" color="#212121" 
            text="로그인"
            _onClick={() => {
              history.push("/login");
            }}
          ></Button>
          <Button bg="#FFD600" color="#212121"
            text="회원가입"
            _onClick={() => {
              history.push("/signup");
            }}
          ></Button>
        </Grid>
      </Grid>
    </React.Fragment>
  );
};

Header.defaultProps = {};

export default Header;
