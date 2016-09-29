const {exec} = require('child_process');

// collection of uids; each uid represents a new tab thats been opened. A uid has
// a pid, cwdTitle, and procTitle
let uids = {};

// setCWTitle will fork a child process and grab the current working directory
// (cwd), format it and attach it to the uid of the tab
const setCWTitle = (uid) =>
  exec(`lsof -p ${uid.pid} | grep cwd | tr -s ' ' | cut -d ' ' -f9-`, (err, cwd) => {
    if (err) {console.error(err)} else {

      // split the cwd into an array
      cwdarr = cwd.trim().split("/")

      // the length of the array will determin how much of the cwd is shown
      if (cwdarr.length <= 4) {
        uid.cwdTitle = cwdarr.join("/")
      } else {
        uid.cwdTitle = `../${cwdarr.slice(Math.max(cwdarr.length - 2, 1)).join("/")}`
      }
    }
  });

//
exports.middleware = (store) => (next) => (action) => {
  switch (action.type) {

    // each time a new tab is opened create an entry in the uids collection and
    // set the title for that tab
    case 'SESSION_ADD':
      uids[action.uid] = {}
      uids[action.uid].pid = action.pid;

      // when a new tab is opened set the initial title
      setCWTitle(uids[action.uid])
      break;

    // monitor for changes to set the title accordingly (for the current tab)
    case 'SESSION_PTY_DATA':
      setCWTitle(uids[action.uid]);
      break;

    // keep track of the process title to append that to the final title
    case 'SESSION_SET_PROCESS_TITLE':
      uids[action.uid].procTitle = action.title
      break;

    // clear a tabs uid out of the collection when it's closed
    case 'SESSION_PTY_EXIT', 'SESSION_USER_EXIT':
      delete uids[action.uid];
      break;
  }
  next(action);
};

// when a single tab is open set it's title accordingly; this is done by finding
// the corresponding "uid" from the collection of uids that house the title
exports.getTabsProps = (parentProps, props) => {
  if (props.tabs.length !== 1 || typeof props.tabs[0].title !== 'string') return props;
  const newProps = Object.assign({}, props);
  newProps.tabs[0].title = `${uids[props.tabs[0].uid].cwdTitle} (${uids[props.tabs[0].uid].procTitle})`
  return newProps;
};

// as more tabs are opened set their titles accordingly; this is done by finding
// their corresponding "uid" from the collection of uids that house the titles
exports.getTabProps = (uid, parentProps, props) => {
  const newProps = Object.assign({}, props);
  newProps.text = `${uids[uid.uid].cwdTitle} (${uids[uid.uid].procTitle})`
  return newProps;
};
