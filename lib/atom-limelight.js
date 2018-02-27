'use babel'

import { CompositeDisposable } from 'atom'

import { config } from './config'

export default {
	subscriptions: null,
	editorSubscription: new CompositeDisposable(),
	activeEditorView: null,
	resetMarkers: null,
	config,
	enabled: config.enabled.default,

	markRow(editor, row) {},

	onChangeFactory(editor) {
		let markers = []
		const resetMarkers = () => {
			markers.forEach(marker => marker.destroy())
			markers = []
		}
		this.resetMarkers = resetMarkers

		const buffer = editor.getBuffer()

		const markRow = row => {
			const lastRow = editor.getLastBufferRow()
			const ranges = []
			if (!buffer.isRowBlank(row)) {
				ranges.push(editor.rowRangeForParagraphAtBufferRow(row))
			} else {
				if (row > 0 && row < lastRow) {
					ranges.push(
						editor.rowRangeForParagraphAtBufferRow(row + 1),
						editor.rowRangeForParagraphAtBufferRow(row - 1)
					)
				} else if (row == 0 && row < lastRow) {
					ranges.push(
						editor.rowRangeForParagraphAtBufferRow(row + 1)
					)
				} else if (row == lastRow) {
					ranges.push(
						editor.rowRangeForParagraphAtBufferRow(row - 1)
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

		return () => {
			resetMarkers()
			const buffer = editor.getBuffer()
			const cursors = editor.getCursors()
			cursors.forEach(c => markRow(c.getBufferRow()))
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
		this.editorSubscription.dispose()
		const onChange = this.onChangeFactory(editor)
		this.editorSubscription.add(editor.onDidChangeCursorPosition(onChange))
		this.editorSubscription.add(editor.onDidAddCursor(onChange))
		onChange()
	},

	turnOff() {
		this.activeEditorView && this.activeEditorView.classList.remove('limelight')
		this.resetMarkers && this.resetMarkers()
		this.editorSubscription.dispose()
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
