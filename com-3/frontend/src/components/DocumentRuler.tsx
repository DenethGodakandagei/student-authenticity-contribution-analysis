"use client";

import React from 'react';

interface DocumentRulerProps {
  zoom?: number;
  mode?: 'google' | 'word' | 'default';
}

export default function DocumentRuler({ zoom = 100, mode = 'default' }: DocumentRulerProps) {
  // 1 to 7.5 inches standard US Letter width (8.5 inches minus 1-inch margins = 6.5-7.5 printable width)
  const inches = [1, 2, 3, 4, 5, 6, 7];

  return (
    <div style={{
      width: '100%',
      maxWidth: '850px',
      margin: '0 auto',
      height: '18px',
      background: mode === 'word' ? '#f3f4f6' : '#f8f9fa',
      borderTop: '1px solid #dadce0',
      borderBottom: '1px solid #dadce0',
      display: 'flex',
      alignItems: 'stretch',
      position: 'relative',
      userSelect: 'none',
      fontSize: '9px',
      color: '#5f6368',
      fontFamily: 'Roboto, Arial, sans-serif'
    }}>
      {/* Left Margin Indent Marker */}
      <div style={{
        position: 'absolute',
        left: '48px',
        top: '0px',
        zIndex: 2,
        width: '0',
        height: '0',
        borderLeft: '5px solid transparent',
        borderRight: '5px solid transparent',
        borderTop: '7px solid #1a73e8'
      }} title="First line indent" />

      {/* Left Margin Shading */}
      <div style={{
        width: '48px',
        background: 'rgba(0, 0, 0, 0.04)',
        borderRight: '1px solid #dadce0'
      }} />

      {/* Main Printable Ruler Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        position: 'relative',
        background: '#ffffff'
      }}>
        {inches.map((inch) => (
          <div
            key={inch}
            style={{
              flex: 1,
              position: 'relative',
              borderRight: '1px solid #c0c4c9',
              height: '100%',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'flex-end',
              paddingRight: '3px'
            }}
          >
            {/* Quarter inch ticks */}
            <div style={{ position: 'absolute', left: '25%', bottom: 0, width: '1px', height: '4px', background: '#d0d4d9' }} />
            <div style={{ position: 'absolute', left: '50%', bottom: 0, width: '1px', height: '7px', background: '#b0b4b9' }} />
            <div style={{ position: 'absolute', left: '75%', bottom: 0, width: '1px', height: '4px', background: '#d0d4d9' }} />
            
            <span style={{ fontSize: '9px', lineHeight: '12px', fontWeight: 600 }}>{inch}</span>
          </div>
        ))}
      </div>

      {/* Right Margin Indent Marker */}
      <div style={{
        position: 'absolute',
        right: '48px',
        top: '0px',
        zIndex: 2,
        width: '0',
        height: '0',
        borderLeft: '5px solid transparent',
        borderRight: '5px solid transparent',
        borderTop: '7px solid #1a73e8'
      }} title="Right indent" />

      {/* Right Margin Shading */}
      <div style={{
        width: '48px',
        background: 'rgba(0, 0, 0, 0.04)',
        borderLeft: '1px solid #dadce0'
      }} />
    </div>
  );
}
