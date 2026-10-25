import SwiftUI

/// Status light: orange = working, cyan = your turn, red = needs you, grey = ended.
struct StatusDot: View {
    let status: String?
    var size: CGFloat = 7
    var hollow = false
    @State private var phase = false

    var body: some View {
        let color = Theme.statusColor(status)
        Circle()
            .fill(hollow ? Color.clear : color)
            .overlay(Circle().stroke(color, lineWidth: hollow ? 1 : 0))
            .frame(width: size, height: size)
            .shadow(color: hollow ? .clear : color.opacity(0.9), radius: phase ? 5 : 1)
            .opacity(status == "waiting" ? (phase ? 1 : 0.35) : 1)
            .onAppear {
                guard status == "busy" || status == "waiting" else { return }
                withAnimation(.easeInOut(duration: status == "waiting" ? 0.5 : 0.9).repeatForever(autoreverses: true)) { phase = true }
            }
    }
}
