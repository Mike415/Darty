//
//  WebView.swift
//  Darty
//
//  WKWebView wrapper that loads the bundled React app
//

import SwiftUI
import WebKit

#if os(iOS)
import UIKit

struct WebView: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()

        // Enable localStorage persistence
        configuration.websiteDataStore = .default()

        // Allow inline media playback
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []

        let webView = WKWebView(frame: .zero, configuration: configuration)

        // Disable bounce/overscroll for native feel
        webView.scrollView.bounces = false
        webView.scrollView.alwaysBounceVertical = false
        webView.scrollView.alwaysBounceHorizontal = false

        // Match the app's dark theme background exactly (#0a0a0a)
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.039, green: 0.039, blue: 0.039, alpha: 1.0)
        webView.scrollView.backgroundColor = UIColor(red: 0.039, green: 0.039, blue: 0.039, alpha: 1.0)

        // Set navigation delegate to keep links inside the WebView
        webView.navigationDelegate = context.coordinator

        // Load the bundled index.html
        loadBundledHTML(in: webView)

        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        // No updates needed
    }

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }
}

#elseif os(macOS)
import AppKit

struct WebView: NSViewRepresentable {
    func makeNSView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()

        // Enable localStorage persistence
        configuration.websiteDataStore = .default()

        let webView = WKWebView(frame: .zero, configuration: configuration)

        // Set navigation delegate to keep links inside the WebView
        webView.navigationDelegate = context.coordinator

        // Load the bundled index.html
        loadBundledHTML(in: webView)

        return webView
    }

    func updateNSView(_ nsView: WKWebView, context: Context) {
        // No updates needed
    }

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }
}
#endif

// Shared functionality
extension WebView {
    func loadBundledHTML(in webView: WKWebView) {
        if let indexURL = Bundle.main.url(forResource: "index", withExtension: "html") {
            print("Loading WebView from: \(indexURL)")
            print("Bundle URL: \(Bundle.main.bundleURL)")
            webView.loadFileURL(indexURL, allowingReadAccessTo: Bundle.main.bundleURL)
        } else {
            print("ERROR: Could not find index.html in bundle")
            if let resourcePath = Bundle.main.resourcePath {
                do {
                    let files = try FileManager.default.contentsOfDirectory(atPath: resourcePath)
                    print("Files in bundle: \(files)")
                } catch {
                    print("Error listing bundle contents: \(error)")
                }
            }
        }
    }
}

class Coordinator: NSObject, WKNavigationDelegate {
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if let url = navigationAction.request.url {
            print("WebView navigating to: \(url)")
        }
        decisionHandler(.allow)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        print("WebView finished loading")
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        print("WebView failed to load: \(error.localizedDescription)")
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        print("WebView provisional navigation failed: \(error.localizedDescription)")
    }
}

#Preview {
    WebView()
        #if os(iOS)
        .ignoresSafeArea()
        #endif
}
