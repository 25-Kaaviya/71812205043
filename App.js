import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams, useLocation } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Paper,
  Box,
  TextField,
  Button,
  IconButton,
  Snackbar,
  Alert,
  Grid,
  Divider,
  Chip,
  Tooltip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Drawer,
  Badge,
  List,
  ListItem,
  ListItemText
} from "@mui/material";
import { ContentCopy, BarChart, Link as LinkIcon, Refresh, DeleteOutline, History, Troubleshoot, Info } from "@mui/icons-material";

// -----------------------------
//  Logger
// -----------------------------
const LOG_STORE_KEY = "am_url_shortener_logs_v1";

const Logger = {
  write(event, payload = {}) {
    const entry = {
      id: crypto.randomUUID(),
      ts: new Date().toISOString(),
      event,
      payload
    };
    try {
      const raw = localStorage.getItem(LOG_STORE_KEY);
      const prev = raw ? JSON.parse(raw) : [];
      prev.unshift(entry);
      localStorage.setItem(LOG_STORE_KEY, JSON.stringify(prev.slice(0, 1000)));
    } catch (_) {}
  },
  read() {
    try {
      const raw = localStorage.getItem(LOG_STORE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  },
  clear() {
    localStorage.removeItem(LOG_STORE_KEY);
  }
};

// -----------------------------
//  Storage helpers
// -----------------------------
const STORE_KEY = "am_url_shortener_store_v1";

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : { items: [] };
  } catch (e) {
    return { items: [] };
  }
}

function saveStore(store) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

function useStore() {
  const [store, setStore] = useState(loadStore());
  useEffect(() => saveStore(store), [store]);
  return [store, setStore];
}

// -----------------------------
//  Utils
// -----------------------------
const isValidUrl = (str) => {
  try {
    const u = new URL(str);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch (_) {
    return false;
  }
};

const isValidShort = (s) => /^[a-zA-Z0-9]{3,15}$/.test(s || "");
const base62 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const genCode = (len = 7) => Array.from({ length: len }, () => base62[Math.floor(Math.random() * base62.length)]).join("");
const nowIso = () => new Date().toISOString();

function minutesFromNow(min) {
  const d = new Date();
  d.setMinutes(d.getMinutes() + min);
  return d.toISOString();
}
function isExpired(iso) {
  if (!iso) return false;
  return new Date(iso).getTime() < Date.now();
}
function getCoarseLocation() {
  return {
    lang: navigator.language,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
  };
}

// -----------------------------
//  Shortener Page
// -----------------------------
function ShortenerPage() {
  const [store, setStore] = useStore();
  const [rows, setRows] = useState([{ longUrl: "", minutes: "", shortcode: "" }]);
  const [snack, setSnack] = useState(null);
  const [showResults, setShowResults] = useState(false);

  const addRow = () => setRows((r) => (r.length >= 5 ? r : [...r, { longUrl: "", minutes: "", shortcode: "" }]));
  const removeRow = (i) => setRows((r) => r.filter((_, idx) => idx !== i));
  const handleChange = (i, key, val) => setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [key]: val } : row)));

  const createShort = () => {
    const existingCodes = new Set(store.items.map((x) => x.shortcode));
    const newItems = [];

    for (let i = 0; i < rows.length; i++) {
      const { longUrl, minutes, shortcode } = rows[i];

      if (!longUrl || !isValidUrl(longUrl)) {
        setSnack({ type: "error", msg: `Row ${i + 1}: Invalid URL.` });
        Logger.write("validation_error", { row: i + 1, reason: "invalid_url", value: longUrl });
        return;
      }

      let mins = 30;
      if (minutes !== "" && minutes !== null) {
        const n = Number(minutes);
        if (!Number.isInteger(n) || n <= 0) {
          setSnack({ type: "error", msg: `Row ${i + 1}: Validity must be a positive integer.` });
          return;
        }
        mins = n;
      }

      let code = shortcode?.trim();
      if (code) {
        if (!isValidShort(code)) {
          setSnack({ type: "error", msg: `Row ${i + 1}: Shortcode must be 3-15 alphanumeric.` });
          return;
        }
        if (existingCodes.has(code)) {
          setSnack({ type: "error", msg: `Row ${i + 1}: Shortcode already exists.` });
          return;
        }
      } else {
        code = genCode(7);
        while (existingCodes.has(code)) code = genCode(7);
      }

      existingCodes.add(code);
      newItems.push({
        id: crypto.randomUUID(),
        shortcode: code,
        longUrl,
        createdAt: nowIso(),
        expireAt: minutesFromNow(mins),
        clicks: [],
      });
    }

    if (newItems.length) {
      setStore((s) => ({ items: [...newItems, ...s.items] }));
      setShowResults(true);
      setSnack({ type: "success", msg: `${newItems.length} short link(s) created.` });
    }
  };

  const copy = async (text) => {
    try { 
      await navigator.clipboard.writeText(text); 
      setSnack({ type: "success", msg: "Copied!" }); 
    } catch (e) { 
      setSnack({ type: "error", msg: "Copy failed." }); 
    }
  };

  const host = window.location.origin;

  return (
    <Container maxWidth="lg" sx={{ my: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5">URL Shortener</Typography>

        <Stack spacing={2} sx={{ my: 2 }}>
          {rows.map((row, idx) => (
            <Paper key={idx} variant="outlined" sx={{ p: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Original Long URL" value={row.longUrl} onChange={(e) => handleChange(idx, "longUrl", e.target.value)} />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField fullWidth label="Validity (minutes)" value={row.minutes} onChange={(e) => handleChange(idx, "minutes", e.target.value)} />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField fullWidth label="Optional Shortcode" value={row.shortcode} onChange={(e) => handleChange(idx, "shortcode", e.target.value)} />
                </Grid>
                <Grid item xs={12} md={1}>
                  <IconButton disabled={rows.length === 1} onClick={() => removeRow(idx)}>
                    <DeleteOutline />
                  </IconButton>
                </Grid>
              </Grid>
            </Paper>
          ))}
          <Stack direction="row" spacing={2}>
            <Button variant="outlined" onClick={addRow} startIcon={<Refresh />}>Add Row</Button>
            <Button variant="contained" onClick={createShort} startIcon={<LinkIcon />}>Create Short Links</Button>
          </Stack>
        </Stack>

        {showResults && (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Short URL</TableCell>
                  <TableCell>Original URL</TableCell>
                  <TableCell>Expires</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {store.items.slice(0, rows.length).map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip label={`${host}/${it.shortcode}`} />
                        <IconButton size="small" onClick={() => copy(`${host}/${it.shortcode}`)}>
                          <ContentCopy fontSize="inherit" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                    <TableCell>{it.longUrl}</TableCell>
                    <TableCell>{new Date(it.expireAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)}>
        {snack && <Alert severity={snack.type}>{snack.msg}</Alert>}
      </Snackbar>
    </Container>
  );
}

// -----------------------------
//  Stats Page (simplified)
// -----------------------------
function StatsPage() {
  const [store] = useStore();
  const host = window.location.origin;

  return (
    <Container maxWidth="lg" sx={{ my: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5">Statistics</Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Short URL</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Expires</TableCell>
                <TableCell>Total Clicks</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {store.items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell>{`${host}/${it.shortcode}`}</TableCell>
                  <TableCell>{new Date(it.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{new Date(it.expireAt).toLocaleString()}</TableCell>
                  <TableCell>{it.clicks.length}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  );
}

// -----------------------------
//  Redirector
// -----------------------------
function Redirector() {
  const { code } = useParams();
  const [store] = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    const item = store.items.find((x) => x.shortcode === code);
    if (item && !isExpired(item.expireAt)) {
      setTimeout(() => {
        window.location.replace(item.longUrl);
      }, 500);
    } else {
      navigate("/");
    }
  }, [code]);

  return <Typography sx={{ m: 3 }}>Redirecting...</Typography>;
}

// -----------------------------
//  Shell
// -----------------------------
function Shell() {
  return (
    <BrowserRouter>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>React URL Shortener</Typography>
          <Button color="inherit" component={Link} to="/">Shorten</Button>
          <Button color="inherit" component={Link} to="/stats">Stats</Button>
        </Toolbar>
      </AppBar>
      <Routes>
        <Route path="/" element={<ShortenerPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/:code" element={<Redirector />} />
      </Routes>
    </BrowserRouter>
  );
}

export default Shell;
