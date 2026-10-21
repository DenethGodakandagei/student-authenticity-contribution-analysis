// app/components/dashboard/NovaAvatarCard.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';

interface NovaAvatarCardProps {
  misconceptionsBefore?: number;
  misconceptionsAfter?: number;
  userName?: string;
}

export default function NovaAvatarCard({
  misconceptionsBefore = 2,
  misconceptionsAfter = 0,
  userName = '',
}: NovaAvatarCardProps) {
  const [viewState, setViewState] = useState<'before' | 'after'>('after');

  const isAfter = viewState === 'after';
  const count = isAfter ? misconceptionsAfter : misconceptionsBefore;

  return (
    <section className="dash-card nova-avatar-card">
      <div className="nova-avatar-card__inner">
        {/* Left Side: Information & Start Actions */}
        <div className="nova-avatar-card__content">
          <div className="nova-avatar-card__badge">
            LEARNING BY TEACHING
          </div>
          <h2 className="nova-avatar-card__title">
            Homework where learning is the point.
          </h2>
          <p className="nova-avatar-card__desc">
            Nova learns directly through your explanations. Notice how her misconceptions clear up as you guide her through each topic.
          </p>

          <div className="nova-avatar-card__stats">
            <div className="nova-avatar-card__stat-item">
              <span className="nova-avatar-card__stat-val">
                {isAfter ? 'Ready' : 'In Progress'}
              </span>
              <span className="nova-avatar-card__stat-lbl">Nova Status</span>
            </div>
            <div className="nova-avatar-card__stat-divider" />
            <div className="nova-avatar-card__stat-item">
              <span className="nova-avatar-card__stat-val">
                {count} {count === 1 ? 'Concept' : 'Misconceptions'}
              </span>
              <span className="nova-avatar-card__stat-lbl">
                {isAfter ? 'Remaining after teaching' : 'Active before teaching'}
              </span>
            </div>
          </div>

          <div className="nova-avatar-card__actions">
            <Link href="/sessions/new" className="nova-avatar-card__btn-primary">
              Teach Nova now
            </Link>
            <span className="nova-avatar-card__hint">
              {isAfter
                ? 'Great progress! Nova is confident in taught concepts.'
                : 'Nova needs your help clarifying fundamental ideas.'}
            </span>
          </div>
        </div>

        {/* Right Side: The Interactive 3D Avatar Showcase */}
        <div className="nova-avatar-card__visual">
          <div className="nova-avatar-display">
            {/* Dashed orbit circle */}
            <div className={`nova-avatar-display__orbit ${isAfter ? 'nova-avatar-display__orbit--active' : ''}`} />

            {/* Speech bubble */}
            <div className={`nova-avatar-display__speech ${isAfter ? 'nova-avatar-display__speech--ready' : 'nova-avatar-display__speech--confused'}`}>
              <span className="nova-avatar-display__speech-text">
                {isAfter ? "Test me, I'm ready!" : "I'm still a bit confused..."}
              </span>
              {isAfter && (
                <svg className="nova-avatar-display__check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>

            {/* Avatar Frame with SVG Illustration */}
            <div className="nova-avatar-display__avatar-frame">
              <svg
                viewBox="0 0 260 260"
                className="nova-avatar-display__svg"
                aria-label="Nova AI student avatar"
                role="img"
              >
                <defs>
                  {/* Background glow gradient */}
                  <radialGradient id="novaBgGlow" cx="50%" cy="40%" r="65%">
                    <stop offset="0%" stopColor="#1E4D3E" stopOpacity="0.45" />
                    <stop offset="60%" stopColor="#0D1110" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#0D1110" />
                  </radialGradient>

                  {/* Skin gradient */}
                  <linearGradient id="novaSkin" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ffdfc9" />
                    <stop offset="100%" stopColor="#f5be9e" />
                  </linearGradient>

                  {/* Hair gradient */}
                  <linearGradient id="novaHair" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#533725" />
                    <stop offset="50%" stopColor="#3d2415" />
                    <stop offset="100%" stopColor="#29160a" />
                  </linearGradient>

                  {/* Shirt gradient */}
                  <linearGradient id="novaShirt" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2c4270" />
                    <stop offset="100%" stopColor="#1b2a47" />
                  </linearGradient>

                  {/* Collar gradient */}
                  <linearGradient id="novaCollar" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b568c" />
                    <stop offset="100%" stopColor="#24375b" />
                  </linearGradient>
                </defs>

                {/* Dark circular canvas */}
                <circle cx="130" cy="130" r="126" fill="url(#novaBgGlow)" />

                {/* Hair back layer */}
                <ellipse cx="130" cy="120" rx="66" ry="60" fill="url(#novaHair)" />

                {/* Ears */}
                <ellipse cx="78" cy="130" rx="14" ry="18" fill="#f2b494" />
                <ellipse cx="79" cy="130" rx="8" ry="11" fill="#df9b7a" opacity="0.8" />
                <ellipse cx="182" cy="130" rx="14" ry="18" fill="#f2b494" />
                <ellipse cx="181" cy="130" rx="8" ry="11" fill="#df9b7a" opacity="0.8" />

                {/* Neck */}
                <path d="M114 155 Q130 162 146 155 L146 182 Q130 188 114 182 Z" fill="#ebaa88" />

                {/* Shirt Body */}
                <path d="M80 250 L84 195 Q98 182 130 182 Q162 182 176 195 L180 250 Z" fill="url(#novaShirt)" />

                {/* Collar Ribbing */}
                <path d="M112 182 Q130 200 148 182 Q130 193 112 182 Z" fill="url(#novaCollar)" />

                {/* Head / Face */}
                <ellipse cx="130" cy="124" rx="52" ry="56" fill="url(#novaSkin)" />

                {/* Cheeks soft blush */}
                <circle cx="102" cy="138" r="9" fill="#f79c88" opacity="0.32" />
                <circle cx="158" cy="138" r="9" fill="#f79c88" opacity="0.32" />

                {/* Eyes */}
                {/* Left Eye */}
                <ellipse cx="110" cy="120" rx="9.5" ry="12" fill="#ffffff" />
                <ellipse cx="111" cy="120" rx="6.8" ry="8.5" fill="#2d1c13" />
                <circle cx="113.5" cy="117.5" r="2.8" fill="#ffffff" />
                <circle cx="109.5" cy="122.5" r="1.3" fill="#ffffff" opacity="0.75" />

                {/* Right Eye */}
                <ellipse cx="150" cy="120" rx="9.5" ry="12" fill="#ffffff" />
                <ellipse cx="149" cy="120" rx="6.8" ry="8.5" fill="#2d1c13" />
                <circle cx="151.5" cy="117.5" r="2.8" fill="#ffffff" />
                <circle cx="147.5" cy="122.5" r="1.3" fill="#ffffff" opacity="0.75" />

                {/* Eyebrows */}
                {isAfter ? (
                  <>
                    {/* Confident, friendly curved eyebrows */}
                    <path d="M101 104 Q111 98 121 103" stroke="#3d2415" strokeWidth="4.2" strokeLinecap="round" fill="none" />
                    <path d="M139 103 Q149 98 159 104" stroke="#3d2415" strokeWidth="4.2" strokeLinecap="round" fill="none" />
                  </>
                ) : (
                  <>
                    {/* Puzzled / questioning eyebrows */}
                    <path d="M101 106 Q111 103 121 101" stroke="#3d2415" strokeWidth="4.2" strokeLinecap="round" fill="none" />
                    <path d="M139 101 Q149 104 159 107" stroke="#3d2415" strokeWidth="4.2" strokeLinecap="round" fill="none" />
                  </>
                )}

                {/* Cute small nose */}
                <path d="M127 127 Q130 137 133 134" stroke="#e09673" strokeWidth="2.8" strokeLinecap="round" fill="none" />

                {/* Mouth */}
                {isAfter ? (
                  // Big confident warm smile
                  <path d="M117 145 Q130 157 143 145" stroke="#7a3424" strokeWidth="3" strokeLinecap="round" fill="none" />
                ) : (
                  // Slight questioning / thinking wave
                  <path d="M120 148 Q127 146 134 148 Q140 149 142 147" stroke="#7a3424" strokeWidth="2.8" strokeLinecap="round" fill="none" />
                )}

                {/* Hair Top & Bangs */}
                <path
                  d="M78 116 Q75 76 112 60 Q138 48 165 62 Q186 78 182 116 Q174 95 158 92 Q144 86 130 96 Q116 88 102 96 Q90 102 78 116 Z"
                  fill="url(#novaHair)"
                />
                {/* Hair Tuft highlights */}
                <path
                  d="M110 65 Q132 46 148 54 Q135 60 128 66 Z"
                  fill="#6b4730"
                  opacity="0.8"
                />
                <path
                  d="M95 85 Q115 80 125 90 Q112 92 100 95 Z"
                  fill="#452a1a"
                />
              </svg>

              {/* Misconceptions badge floating at the chest */}
              <div className={`nova-avatar-display__misconceptions-pill ${isAfter ? 'nova-avatar-display__misconceptions-pill--zero' : 'nova-avatar-display__misconceptions-pill--warn'}`}>
                {count} {count === 1 ? 'MISCONCEPTION' : 'MISCONCEPTIONS'}
              </div>
            </div>

            {/* Segmented control: Before Teaching / After Teaching */}
            <div className="nova-avatar-display__toggle" role="group" aria-label="Teaching comparison">
              <button
                type="button"
                className={`nova-avatar-display__toggle-btn ${!isAfter ? 'nova-avatar-display__toggle-btn--active' : ''}`}
                onClick={() => setViewState('before')}
                aria-pressed={!isAfter}
              >
                Before Teaching
              </button>
              <button
                type="button"
                className={`nova-avatar-display__toggle-btn ${isAfter ? 'nova-avatar-display__toggle-btn--active' : ''}`}
                onClick={() => setViewState('after')}
                aria-pressed={isAfter}
              >
                After Teaching
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
