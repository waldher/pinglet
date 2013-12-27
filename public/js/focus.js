var focused = true;
var focusLock = false;

window.onfocus = function(e){
  clearTimeout(focusLock);
  focusLock = setTimeout(function(){
    focusLock = false;
  }, 1000);
  focused = true;
};

window.onblur = function(e){
  if(!focusLock){
    focused = false;
    $("#chatWindow .lastSeenMessage").removeClass("lastSeenMessage");
    $("#chatWindow .messageRow:last").addClass("lastSeenMessage");
  }
};
