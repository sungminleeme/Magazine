//action 생성을 편하게 할 수 있게 도와주는 패키지
import { createAction, handleActions } from "redux-actions";
//reducer 불변성 유지를 위한 패키지
import { produce } from "immer";
import { firestore, storage } from "../../shared/firebase";
import "moment";
import moment from "moment";

import { actionCreators as imageActions } from "./image";


//action type
const SET_POST = "SET_POST";
const ADD_POST = "ADD_POST";
const EDIT_POST = "EDIT_POST";
const LOADING = "LOADING";
const LIKE_TOGGLE = "LIKE_TOGGLE";

const setPost = createAction(SET_POST, (post_list, paging) => ({ post_list, paging }));
const addPost = createAction(ADD_POST, (post) => ({ post }));
const editPost = createAction(EDIT_POST, (post_id, post) => ({
  post_id,
  post,
}));
const loading = createAction(LOADING, (is_loading) => ({ is_loading }));
// 좋아요 토글 액션 생성자
const likeToggle = createAction(LIKE_TOGGLE, (post_id, is_like = null) => ({
  post_id,
  is_like,
}))


const initialState = {
  list: [],
  paging: { start: null, next: null, size: 3 },
  is_loading: false,
  is_like: false,
};
//post마다 필요한 initialState
const initialPost = {
  // id: 0,
  // user_info: {
  //   user_name: "mean0",
  //   user_profile: "https://mean0images.s3.ap-northeast-2.amazonaws.com/4.jpeg",
  // },
  image_url: "https://mean0images.s3.ap-northeast-2.amazonaws.com/4.jpeg",
  contents: "",
  layout_type: "a",
  comment_cnt: 0,
  insert_dt: moment().format("YYYY-MM-DD HH:mm:ss"),
  is_like: false,
};

const editPostFB = (post_id = null, post = {}) => {
  return function (dispatch, getState, { history }) {
    if (!post_id) {
      console.log("게시물 정보가 없어요!");
      return;
    }

    const _image = getState().image.preview;

    const _post_idx = getState().post.list.findIndex((p) => p.id === post_id);
    const _post = getState().post.list[_post_idx];

    console.log(_post);

    const postDB = firestore.collection("post");

    if (_image === _post.image_url) {
      postDB
        .doc(post_id)
        .update(post)
        .then((doc) => {
          dispatch(editPost(post_id, { ...post }));
          history.replace("/");
        });

      return;
    } else {
      const user_id = getState().user.user.uid;
      const _upload = storage
        .ref(`images/${user_id}_${new Date().getTime()}`)
        .putString(_image, "data_url");

      _upload.then((snapshot) => {
        snapshot.ref
          .getDownloadURL()
          .then((url) => {
            console.log(url);

            return url;
          })
          .then((url) => {
            postDB
              .doc(post_id)
              .update({ ...post, image_url: url })
              .then((doc) => {
                dispatch(editPost(post_id, { ...post, image_url: url }));
                history.replace("/");
              });
          })
          .catch((err) => {
            window.alert("앗! 이미지 업로드에 문제가 있어요!");
            console.log("앗! 이미지 업로드에 문제가 있어요!", err);
          });
      });
    }
  };
};

const addPostFB = (contents = "", layout_type = "a") => {
  return function (dispatch, getState, { history }) {
    const postDB = firestore.collection("post");

    const _user = getState().user.user;

    const user_info = {
      user_name: _user.user_name,
      user_id: _user.uid,
      user_profile: _user.user_profile,
    };
      //지금 시점을 알기 위해서 정보를 적음
    const _post = {
      ...initialPost,
      contents: contents,
      layout_type: layout_type,
      insert_dt: moment().format("YYYY-MM-DD HH:mm:ss"),
    };

    const _image = getState().image.preview;

    if (!_image) {
      window.alert("이미지가 필요해요!");
      return;
    }
    if (!_post) {
      window.alert("내용이필요");
      return;
    }
    const _upload = storage
      .ref(`images/${user_info.user_id}_${new Date().getTime()}`)
      .putString(_image, "data_url");

    _upload.then((snapshot) => {
      snapshot.ref
        .getDownloadURL()
        .then((url) => {
          console.log(url);

          return url;
        })
        .then((url) => {
          postDB
            .add({ ...user_info, ..._post, image_url: url })
            .then((doc) => {
              let post = { user_info, ..._post, id: doc.id, image_url: url };
              dispatch(addPost(post));
              history.replace("/");

              dispatch(imageActions.setPreview(null));
            })
            .catch((err) => {
              window.alert("앗! 포스트 작성에 문제가 있어요!");
              console.log("post 작성에 실패했어요!", err);
            });
        })
        .catch((err) => {
          window.alert("앗! 이미지 업로드에 문제가 있어요!");
          console.log("앗! 이미지 업로드에 문제가 있어요!", err);
        });
    });
  };
};

const getPostFB = (start = null, size = 3) => {
  return function (dispatch, getState, { history }) {

    let _paging = getState().post.paging;

    if(_paging.start && !_paging.next){
      return;
    }

    dispatch(loading(true));
    const postDB = firestore.collection("post");

    let query = postDB.orderBy("insert_dt", "desc");

    if(start){
      query = query.startAt(start);
    }


    query
      .limit(size + 1)
      .get()
      .then((docs) => {
        let post_list = [];

        let paging = {
          start: docs.docs[0],
          next: docs.docs.length === size+1? docs.docs[docs.docs.length -1] : null,
          size: size,
        }

        docs.forEach((doc) => {
          let _post = doc.data();

          // ['commenct_cnt', 'contents', ..]
          let post = Object.keys(_post).reduce(
            (acc, cur) => {
              if (cur.indexOf("user_") !== -1) {
                return {
                  ...acc,
                  user_info: { ...acc.user_info, [cur]: _post[cur] },
                };
              }
              return { ...acc, [cur]: _post[cur] };
            },
            { id: doc.id, user_info: {} }
          );

          post_list.push(post);
        });

        post_list.pop();

        if(getState().user.user){
          dispatch(setIsLike(post_list, paging));
        }else{
        dispatch(setPost(post_list, paging));}
      });
  };
};


const toggleLikeFB = (post_id) => {
  return function (dispatch, getState, { history }) {
    // 유저 정보가 없으면 실행하지 않기!
    if (!getState().user.user) {
      return;
    }

    const postDB = firestore.collection("post");
    const likeDB = firestore.collection("like");
    
    // post를 찾기 위해, 배열의 몇 번째에 있나 찾아옵니다.
    const _idx = getState().post.list.findIndex((p) => p.id === post_id);

    // post 정보를 가져오고,
    const _post = getState().post.list[_idx];

    // user id도 가져와요!
    const user_id = getState().user.user.uid;

    // 좋아요한 상태라면 해제하기
    // 해제 순서
    // 1. likeDB에서 해당 데이터를 지우고,
    // 2. postDB에서 like_cnt를 -1해주기
    if (_post.is_like) {
      likeDB
        .where("post_id", "==", _post.id)
        .where("user_id", "==", user_id)
        .get()
        .then((docs) => {
          // batch는 파이어스토어에 작업할 내용을 묶어서 한번에 하도록 도와줘요!
          // 자세한 내용은 firestore docs를 참고해주세요 :)
          // 아래에서 like 콜렉션에 있을 좋아요 데이터를 지우고,
          // post 콜렉션의 like_cnt를 하나 빼줬습니다!
          let batch = firestore.batch();

          docs.forEach((doc) => {
            batch.delete(likeDB.doc(doc.id));
          });

          batch.update(postDB.doc(post_id), {
            like_cnt:
              _post.like_cnt - 1 < 1 ? _post.like_cnt : _post.like_cnt - 1,
          });

          batch.commit().then(() => {
            // 이제 리덕스 데이터를 바꿔줘요!
            dispatch(likeToggle(post_id, !_post.is_like));
          });
        })
        .catch((err) => {
          console.log(err);
        });
    } else {
      // 좋아요 해제 상태라면 좋아요 하기
      // 좋아요 순서
      // 1. likeDB에서 해당 데이터를 넣고,
      // 2. postDB에서 like_cnt를 +1해주기

      likeDB.add({ post_id: post_id, user_id: user_id }).then((doc) => {
        postDB
          .doc(post_id)
          .update({ like_cnt: _post.like_cnt + 1 })
          .then((doc) => {
            // 이제 리덕스 데이터를 바꿔줘요!
            dispatch(likeToggle(post_id, !_post.is_like));
          });
      });
    }
  };
};

// 좋아요 리스트를 리덕스에 넣는 함수
const setIsLike = (_post_list, paging) => {
  return function (dispatch, getState, { history }) {
    if (!getState().user.is_login) {
      return;
    }
    if (paging.start && !paging.next) {
      return;
    }
    const likeDB = firestore.collection("like");
    // post_list의 id 배열
    const post_ids = _post_list.map((p) => p.id);
    // query를 써줍니다!
    // 저는 post_id를 기준으로 가져올거예요.
    let like_query = likeDB.where("post_id", "in", post_ids);

    like_query.get().then((like_docs) => {
      // 이제 가져온 like_docs에서 로그인한 유저가 좋아요했는 지 확인해볼까요?
      // 좋아요했는 지 확인한 후, post의 is_like를 true로 바꿔주면 끝입니다! :)

      // 주의) 여기에서 데이터를 정제할건데, 여러 가지 방법으로 데이터를 정제할 수 있어요.
      // 지금은 우리한테 익숙한 방법으로 한 번 해보고, 나중에 다른 방법으로도 해보세요 :)

      // 파이어스토어에서 가져온 데이터를 {}로 만들어줄거예요.
      let like_list = {};
      like_docs.forEach((doc) => {
        // like_list에 post_id를 키로 쓰는 {}!
        // like_list[doc.data().post_id] :파이어스토어에서 가져온 데이터 하나 (=doc)의 data중 post_id를 키로 씁니다.
        // [ // <- 대괄호 열었다! 밸류는 배열로 할거예요!
        //   ...like_list[doc.data().post_id], // 해당 키에 밸류가 있다면, 그 밸류를 그대로 넣어주기
        //   doc.data().user_id, // user_id를 배열 안에 넣어줘요!
        // ]; <- 대괄호 닫기!

        // like_list에 post_id로 된 키가 있다면?
        // 있으면 배열에 기존 배열 + 새로운 user_id를 넣고,
        // 없으면 새 배열에 user_id를 넣어줍니다! :)
        if (like_list[doc.data().post_id]) {
          like_list[doc.data().post_id] = [
            ...like_list[doc.data().post_id],
            doc.data().user_id,
          ];
        } else {
          like_list[doc.data().post_id] = [doc.data().user_id];
        }
      });

      // 아래 주석을 풀고 콘솔로 확인해보세요!
       console.log(like_list);

      // user_id 가져오기!
      const user_id = getState().user.user.uid;
      let post_list = _post_list.map((p) => {
        // 만약 p 게시글을 좋아요한 목록에 로그인한 사용자 id가 있다면?
        if (like_list[p.id] && like_list[p.id].indexOf(user_id) !== -1) {
          // is_like만 true로 바꿔서 return 해줘요!
          return { ...p, is_like: true };
        }

        return p;
      });

      dispatch(setPost(post_list, paging));
    });
  };
};

const getOnePostFB = (id) => {
  return function(dispatch, getState, {history}){
    const postDB = firestore.collection("post");
    postDB
      .doc(id)
      .get()
      .then((doc) => {
        console.log(doc);
        console.log(doc.data());

        let _post = doc.data();
        let post = Object.keys(_post).reduce(
          (acc, cur) => {
            if (cur.indexOf("user_") !== -1) {
              return {
                ...acc,
                user_info: { ...acc.user_info, [cur]: _post[cur] },
              };
            }
            return { ...acc, [cur]: _post[cur] };
          },
          { id: doc.id, user_info: {} }
        );

        dispatch(setPost([post]));
      });
  }
}

export default handleActions(
  {
    [SET_POST]: (state, action) =>
      produce(state, (draft) => {
        draft.list.push(...action.payload.post_list);

        draft.list = draft.list.reduce((acc, cur) => {
          if(acc.findIndex(a => a.id === cur.id) === -1){
            return [...acc, cur];
          }else{
            acc[acc.findIndex((a) => a.id === cur.id)] = cur;
            return acc;
          }
        }, []);


        if(action.payload.paging){
          draft.paging = action.payload.paging;
        }
        
        draft.is_loading = false;
      }),

    [ADD_POST]: (state, action) =>
      produce(state, (draft) => {
        draft.list.unshift(action.payload.post);
      }),
    [EDIT_POST]: (state, action) =>
      produce(state, (draft) => {
        let idx = draft.list.findIndex((p) => p.id === action.payload.post_id);

        draft.list[idx] = { ...draft.list[idx], ...action.payload.post };
      }),
      [LOADING]: (state, action) => produce(state, (draft) => {
        draft.is_loading = action.payload.is_loading;
      }),
      [LIKE_TOGGLE]: (state, action) =>
      produce(state, (draft) => {
        // 배열에서 몇 번째에 있는 지 찾은 다음, is_like를 action에서 가져온 값으로 바꾸기!
        let idx = draft.list.findIndex((p) => p.id === action.payload.post_id);

        draft.list[idx].is_like = action.payload.is_like;
      }),
  },
  initialState
);

const actionCreators = {
  setPost,
  addPost,
  editPost,
  getPostFB,
  addPostFB,
  editPostFB,
  getOnePostFB,
  toggleLikeFB,
};

export { actionCreators };
