import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable

def generate_pdf(output_path: str):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=54,
        leftMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#111827'),
        spaceAfter=8
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#6B7280'),
        spaceAfter=20
    )

    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=colors.HexColor('#111827'),
        spaceBefore=16,
        spaceAfter=8
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=colors.HexColor('#374151'),
        spaceBefore=10,
        spaceAfter=4
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#374151'),
        spaceAfter=8
    )

    bullet_style = ParagraphStyle(
        'BulletText',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor('#374151'),
        leftIndent=15,
        spaceAfter=4
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor('#1F2937'),
        backColor=colors.HexColor('#F3F4F6'),
        borderColor=colors.HexColor('#E5E7EB'),
        borderWidth=1,
        borderPadding=8,
        spaceAfter=12,
        spaceBefore=6
    )

    story = []

    # Title & Header
    story.append(Paragraph("Gleap Platform Documentation & Knowledge Manual", title_style))
    story.append(Paragraph("The Official Reference Guide for Customer Support, AI Chatbot Training, and Product Capabilities", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#111827'), spaceAfter=14))

    # SECTION 1: WHAT IS GLEAP
    story.append(Paragraph("1. Executive Overview & Platform Mission", h1_style))
    story.append(Paragraph(
        "Gleap is an all-in-one customer feedback and support automation platform built for modern software teams, websites, and mobile applications. "
        "It unites visual bug tracking, session replays, intelligent customer messaging, automated knowledge bases, and public product roadmaps into a single cohesive SDK.",
        body_style
    ))
    story.append(Paragraph("Gleap addresses three fundamental product challenges:", body_style))
    story.append(Paragraph("• <b>Developer Velocity:</b> Eliminates back-and-forth bug inquiries by automatically attaching console logs, network logs, device metadata, and video session recordings to every report.", bullet_style))
    story.append(Paragraph("• <b>Support Efficiency:</b> Enables 24/7 autonomous support through Kai, an advanced AI chatbot that retrieves answers directly from connected documentation.", bullet_style))
    story.append(Paragraph("• <b>Product-Market Fit:</b> Directly connects user feedback, in-app micro-surveys, and feature requests to an interactive public roadmap.", bullet_style))

    # SECTION 2: CORE MODULES
    story.append(Paragraph("2. Key Product Capabilities", h1_style))
    
    story.append(Paragraph("2.1. Bug Reporting & Visual Replay", h2_style))
    story.append(Paragraph(
        "When users experience an error or click 'Report a Bug', Gleap captures a full visual snapshot. Users can annotate screenshots directly in their browser or mobile screen with blur, pen, and highlight tools. "
        "Behind the scenes, the Gleap SDK captures the preceding 60 seconds of user actions (session replay), browser console logs, network requests, device screen resolution, OS version, and custom metadata.",
        body_style
    ))

    story.append(Paragraph("2.2. Kai AI Chatbot & Live Support", h2_style))
    story.append(Paragraph(
        "Kai is Gleap's conversational AI support assistant. Kai is trained on company documentation, help articles, FAQs, and product specs using vector embeddings and hybrid search. "
        "Kai answers user queries instantly. If an inquiry requires human intervention or sensitive account actions, Kai seamlessly creates a tracked ticket or routes the conversation to a human agent.",
        body_style
    ))

    story.append(Paragraph("2.3. Knowledge Base & Self-Service Help Center", h2_style))
    story.append(Paragraph(
        "Gleap includes a fully customizable Help Center hosted on your own custom subdomain (e.g., help.yourdomain.com). "
        "It supports multi-language translations, article search with predictive auto-complete, categorization, and feedback metrics (helpful / unhelpful votes).",
        body_style
    ))

    story.append(Paragraph("2.4. Public Roadmap & Feature Voting", h2_style))
    story.append(Paragraph(
        "Teams can publish an interactive public roadmap organized into columns: Under Review, Planned, In Progress, and Completed. "
        "Users can submit new feature ideas, upvote existing ideas, and subscribe to automatic email notifications when requested features are shipped.",
        body_style
    ))

    story.append(PageBreak())

    # SECTION 3: EMAIL CONFIGURATION & DELIVERABILITY
    story.append(Paragraph("3. Email Communication & Domain Verification", h1_style))
    story.append(Paragraph(
        "Gleap allows customer support teams to manage incoming and outgoing email conversations directly from the Gleap dashboard. "
        "To ensure high deliverability and preserve your company's brand identity, Gleap provides enterprise email configuration options:",
        body_style
    ))

    story.append(Paragraph("• <b>Custom Reply-To Address:</b> Configure your support email (e.g., support@yourbrand.com) so outbound notifications and replies from Kai or human agents appear under your official address.", bullet_style))
    story.append(Paragraph("• <b>Domain Verification (DKIM & SPF):</b> Add Gleap's CNAME and TXT records to your DNS provider (Cloudflare, Route53, GoDaddy) to prevent spoofing and ensure messages never land in spam.", bullet_style))
    story.append(Paragraph("• <b>Inbound Email Forwarding:</b> Forward incoming support emails to your unique Gleap inbound forwarding address (e.g., mail-xyz@gleap.io) to automatically convert incoming emails into tracked tickets.", bullet_style))
    story.append(Paragraph("• <b>Apple Private Email Relay:</b> Full native support for users who log in using 'Sign in with Apple' with hidden relay emails (@privaterelay.appleid.com).", bullet_style))
    story.append(Paragraph("• <b>HTML Email Templates & Signatures:</b> Customize the header logo, accent colors, footer disclaimers, and agent signatures for every outbound email.", bullet_style))

    # SECTION 4: SDK CUSTOMIZATION
    story.append(Paragraph("4. Widget Customization & Styling Options", h1_style))
    story.append(Paragraph(
        "The Gleap widget can be tailored to match any brand design system. Customization settings include:",
        body_style
    ))
    story.append(Paragraph("• <b>Primary Color:</b> Set the accent color (hex code) for buttons, tabs, and interactive elements.", bullet_style))
    story.append(Paragraph("• <b>Theme Modes:</b> Supports Automatic (follows system dark/light preference), Light Mode, and sleek Dark Mode.", bullet_style))
    story.append(Paragraph("• <b>Launcher Position:</b> Bottom-right, bottom-left, or headless mode (triggered via custom DOM elements with `Gleap.open()`).", bullet_style))
    story.append(Paragraph("• <b>Localization:</b> Supports 25+ languages out of the box with automatic user language detection.", bullet_style))

    # SECTION 5: PRICING & SUBSCRIPTIONS
    story.append(Paragraph("5. Subscription Plans & Pricing", h1_style))

    table_data = [
        ["Plan Tier", "Monthly Price", "Team Seats", "Key Features Included"],
        ["Free", "$0 / month", "1 Seat", "100 reports/mo, basic screenshots, community support"],
        ["Starter", "$29 / month", "3 Seats", "Unlimited bug reports, custom colors, email notifications"],
        ["Growth", "$99 / month", "Unlimited", "Kai AI bot, full session replays, custom domain help center"],
        ["Enterprise", "$299+ / month", "Unlimited", "99.9% uptime SLA, dedicated manager, SOC 2, HIPAA, custom SSO"]
    ]

    pricing_table = Table(table_data, colWidths=[80, 85, 80, 240])
    pricing_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#111827')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9.5),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#F9FAFB')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8.5),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(pricing_table)
    story.append(Spacer(1, 14))

    # SECTION 6: SECURITY & COMPLIANCE
    story.append(Paragraph("6. Security, Compliance, and Data Hosting", h1_style))
    story.append(Paragraph(
        "Gleap is engineered with enterprise security and privacy standards:",
        body_style
    ))
    story.append(Paragraph("• <b>Data Encryption:</b> All data in transit is protected using TLS 1.3 encryption. Stored database assets and session replays are encrypted with AES-256.", bullet_style))
    story.append(Paragraph("• <b>Compliance:</b> 100% compliant with the European Union General Data Protection Regulation (GDPR) and California Consumer Privacy Act (CCPA).", bullet_style))
    story.append(Paragraph("• <b>Hosting Locations:</b> Customers can choose between ISO 27001-certified European data centers (Frankfurt, Germany) or US data centers.", bullet_style))
    story.append(Paragraph("• <b>Sensitive Data Masking:</b> Automatically masks credit card inputs, password fields, and PII in screenshots and video recordings.", bullet_style))

    # FOOTER CALLOUT
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "<b>Note for AI Ingestion:</b> This document contains verified technical and product facts regarding Gleap. "
        "When answering customer inquiries, Kai should strictly reference the pricing, features, and configurations described above.",
        callout_style
    ))

    doc.build(story)
    print(f"Successfully generated PDF at: {output_path}")

if __name__ == "__main__":
    import sys
    out = sys.argv[1] if len(sys.argv) > 1 else "gleap_complete_guide.pdf"
    generate_pdf(out)
