'use babel'

import { CompositeDisposable } from 'atom'

import { config } from './config'

export default {
	subscriptions: null,
	editorSubscription: null,
	activeEditorView: null,
	resetMarkers: null,
	config,
	enabled: config.enabled.default,

	onChangeFactory(editor) {
		let markers = []
		const resetMarkers = () => {
			markers.forEach(marker => marker.destroy())
			markers = []
		}
		this.resetMarkers = resetMarkers

		return () => {
			resetMarkers()
			const buffer = editor.getBuffer()
			const cursor = editor.getCursors()[0]
			const startRow = cursor.getBufferRow()
			const lastRow = editor.getLastBufferRow()
			const ranges = []
			if (!buffer.isRowBlank(startRow)) {
				ranges.push(
					editor.languageMode.rowRangeForParagraphAtBufferRow(startRow)
				)
			} else {
				if (startRow > 0 && startRow < lastRow) {
					ranges.push(
						editor.languageMode.rowRangeForParagraphAtBufferRow(startRow + 1),
						editor.languageMode.rowRangeForParagraphAtBufferRow(startRow - 1)
					)
				} else if (startRow == 0 && startRow < lastRow) {
					ranges.push(
						editor.languageMode.rowRangeForParagraphAtBufferRow(startRow + 1)
					)
				} else if (startRow == lastRow) {
					ranges.push(
						editor.languageMode.rowRangeForParagraphAtBufferRow(startRow - 1)
					)
				}
			}
			ranges.forEach(range => {
				if (!range) {
					return
				}
				const marker = editor.markBufferRange(range)
				const decoration = editor.decorateMarker(marker, {
					type: 'line',
					class: 'atom-limelight'
				})
				markers.push(marker)
			})
		}
	},

	activate() {
		this.subscriptions = new CompositeDisposable()
		const subscription = atom.workspace.observeActiveTextEditor(editor => {
			if (!this.enabled) {
				return
			}
			if (this.activeEditorView) {
				this.activeEditorView.classList.remove('limelight')
			}
			this.turnOn(editor)
		}, atom.workspace.getActiveTextEditor())

		this.subscriptions.add(subscription)

		this.subscriptions.add(
			atom.commands.add('atom-workspace', {
				'atom-limelight:toggle': this.toggle.bind(this)
			})
		)

		atom.config.observe('atom-limelight.enabled', enabled => {
			if (enabled) {
				this.turnOn(atom.workspace.getActiveTextEditor())
			} else {
				this.turnOff()
			}
		})
	},

	turnOn(editor) {
		if (!editor) {
			return
		}
		const editorView = atom.views.getView(editor)
		this.activeEditorView = editorView
		this.activeEditorView.classList.add('limelight')
		this.resetMarkers && this.resetMarkers()
		this.editorSubscription && this.editorSubscription.dispose()
		const onChange = this.onChangeFactory(editor)
		this.editorSubscription = editor.onDidChangeCursorPosition(onChange)
		onChange()
	},

	turnOff() {
		this.activeEditorView && this.activeEditorView.classList.remove('limelight')
		this.resetMarkers && this.resetMarkers()
		this.editorSubscription && this.editorSubscription.dispose()
	},

	toggle() {
		this.enabled = !this.enabled
		atom.config.set('atom-limelight.enabled', this.enabled)
		if (this.enabled) {
			this.turnOn(atom.workspace.getActiveTextEditor())
		} else {
			this.turnOff()
		}
	},

	deactivate() {
		this.disposables = []
		this.subscriptions.dispose()
	},

	serialize() {
		return {}
	}
}
