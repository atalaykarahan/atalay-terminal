'use strict';

// Power save, the Mac app's PowerSaver.swift: the dashboard's map draws fewer and smaller frames, in front too, and its
// cinematic camera doesn't start on its own (QUALITY in orbit/index.js). Off unless asked for, on battery too: the
// switch on the map turns it on or off, and it comes on by itself below 20% on battery or while Windows' Energy Saver
// (Battery saver before Windows 11 24H2, the Mac's Low Power Mode) is on, unless Settings · POWER says no. Turned off by
// hand while it was on by itself, it stays off until the battery is no longer low (the PC charges).
//
// main.js says when the PC goes on battery or back on the adapter (powerMonitor), and runaways.js's PowerShell reads
// the battery's charge and the saver with every reading (`read`): Electron tells neither.

const os = require('node:os');

// Below this charge (%), on battery, power save comes on by itself.
const THRESHOLD = 20;

// What Windows calls its saver: Energy Saver since Windows 11 24H2 (build 26100), Battery saver before.
const SAVER = Number(os.release().split('.')[2]) >= 26100 ? 'Energy Saver' : 'Battery Saver';

// - settings: main.js's { get, set } (the switch and Settings' row are kept there, under the Mac's names)
// - onBattery(): is the PC running on its battery now
// - onChange(): anything the page shows changed (the battery's charge too)
function createPowerSaver({ settings, onBattery = () => false, onChange = () => {} }) {
  // The map's switch, kept.
  let chosen = settings.get('powerSave') === true;
  // Settings' "on by itself at low battery".
  let auto = settings.get('powerSaveAuto') !== false;
  // On by itself now; turned off by hand while it was (off until the battery is no longer low).
  let automatic = false;
  let dismissed = false;
  // The battery's charge (%) while the PC runs on it, and whether the saver is on: the latest reading.
  let charge = null;
  let saver = false;
  let battery = null;
  let lowPower = false;
  let sent = '';

  const on = () => chosen || automatic;

  // The map's switch.
  function choose(value) {
    chosen = !!value;
    settings.set('powerSave', chosen);
    if (!chosen && automatic) {
      automatic = false;
      dismissed = true;
    }
    changed();
  }

  // Settings: on by itself at low battery, or never.
  function setAuto(value) {
    auto = !!value;
    settings.set('powerSaveAuto', auto);
    update();
  }

  // A reading of the system: the battery's charge (%, null without a battery) and whether the saver is on.
  function read(r) {
    charge = Number.isInteger(r && r.charge) && r.charge >= 0 && r.charge <= 100 ? r.charge : null;
    saver = !!(r && r.saver);
    update();
  }

  // The PC went on battery or back on the adapter, or a reading came: on by itself, or not.
  function update() {
    battery = onBattery() ? charge : null;
    lowPower = saver;
    const low = lowPower || (battery !== null && battery < THRESHOLD);
    if (!low) dismissed = false;
    automatic = auto && low && !dismissed;
    changed();
  }

  function changed() {
    const now = json();
    if (now === sent) return;
    sent = now;
    try {
      onChange();
    } catch (e) {
      console.error('power: onChange', e);
    }
  }

  // For the page: the map's switch and Settings' row (app.js setPowerSave), as the Mac's, with what the saver is called.
  function json() {
    return JSON.stringify({ auto, automatic, battery, chosen, lowPower, on: on(), saver: SAVER, threshold: THRESHOLD });
  }

  return { on, choose, setAuto, read, update, json };
}

module.exports = { createPowerSaver };
