import SwiftUI

struct ContentView: View {
    var body: some View {
        WebView()
            #if os(iOS)
            .ignoresSafeArea()
            #endif
    }
}

#Preview {
    ContentView()
}
