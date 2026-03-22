// state.js — Single source of truth for all shared application state.
// All other modules READ and WRITE these variables but do NOT re-declare them.

var userDocs    = [];   // documents loaded from the backend
var chatHistory = [];   // chat message history (capped at CHAT_HISTORY_MAX)
var viewingId   = null; // id of the document currently shown in the viewer
var editingTags = [];   // tags array while editing a document
var pendingDoc  = null; // document object waiting for tag-confirm before save
var pendingTags = [];   // tags array for pendingDoc
var lang        = 'ja'; // active UI language

var CHAT_HISTORY_MAX = 40; // max messages kept in chatHistory (20 pairs)
