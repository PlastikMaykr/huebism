import * as d3 from 'd3';
import './modal.css';
import { Swatch, Palette } from '../classes';
import { FormatExchange, FileExchange } from '../exchange/exchange';

export class OrganizeModal {
    static { }

    /** @type {HTMLDialogElement} */
    dialog;
    /** @type {d3.Selection} */
    closeButton;
    /** @type {d3.Selection} */
    openButton;
    /** @type {d3.Selection} */
    modal;
    /** @type {d3.Selection} */
    overview;
    /** @type {Map<Swatch,HTMLDivElement>} */
    swatchMap;
    /** @type {Function} */
    callback;

    constructor(dialog, openButton, callback) {
        this.dialog = dialog instanceof HTMLDialogElement ?
            dialog : document.querySelector(dialog);

        dialog = d3.select(this.dialog)
            .on('close', () => this.close())
            .on('mouseup', (event) => {
                // console.log(event);
                if (event.target !== this.dialog) return;
                this.dialog.close();
            });

        dialog.select('#import')
            .on('click', (event, d) => {
                FileExchange.load((name, extension, stringed) => {
                    const parsed = FormatExchange.parse(stringed, extension);
                    console.log({ name, extension, stringed, parsed });

                    this.update();
                });
            });

        this.closeButton = dialog
            .select('.close')
            .on('click', () => this.dialog.close());

        this.openButton = openButton instanceof d3.selection ?
            openButton : d3.select(openButton);
        this.openButton.on('click', () => this.open());

        this.modal = dialog.select('.modal');
        this.overview = this.modal.select('.overview')
            .call(dragger, this);

        this.swatchMap = new Map();

        this.callback = callback || (() => { });
    }

    open() {
        console.log('Organize');

        this.update();

        this.dialog.showModal();

        this.closeButton.node().focus();
    }

    close() {
        console.log('Done organizing');

        this.overview.selectAll('div').remove();

        this.callback();
    }

    update() {
        this.overview.selectAll('.org-wrapper')
            .data(Palette.collection, d => d.id)
            .join(enter => enter.append('div')
                .classed('org-wrapper', true)
                .call(wrapper => {
                    wrapper.append('div')
                        .classed('org-controls', true)
                        .call(controls => controls
                            .append('p')
                            .call(editableContent, 'name')
                        )
                        .call(controls => controls
                            .append('button')
                            .classed('org-export', true)
                            .text('Export JSON')
                            .on('click', (event, palette) => {
                                // const extension = FormatExchange.chosen;
                                const extension = 'json';
                                const serialized = FormatExchange.format(palette, extension);
                                console.log(serialized);
                                FileExchange.save(palette.name + '.' + extension, serialized);
                            })
                        )
                        .call(controls => controls
                            .append('button')
                            .classed('org-export', true)
                            .text('Export CSS')
                            .on('click', (event, palette) => {
                                const extension = 'css';
                                const serialized = FormatExchange.format(palette, extension);
                                console.log(serialized);
                                FileExchange.save(palette.name + '.' + extension, serialized);
                            })
                        );

                    wrapper.append('div')
                        .classed('org-palette', true);
                })
            )
            .call(update => update.select('.org-palette')
                .selectAll('.org-swatch')
                .data(d => d.swatches, d => d.id)
                .join(
                    enter => enter
                        .append('div')
                        .classed('org-swatch', true)
                        .each((d, i, g) => this.swatchMap.set(d, g[i]))
                        .call(editableContent, 'name')
                        .style('color', d => d3.lch(d.color).l > 70 ? '#2B2B2B' : null)
                        .style('background-color', d => d.color.formatHex())
                    // update => update
                    // exit => exit.remove()
                    // NOTE: swatchMap would still hold on to both swatch and preview
                )
                .style('animation', 'none')
            )

        this.callback();
    }
}

function editableContent(element, property) {
    element
        .attr('contenteditable', 'false')
        .attr('spellcheck', 'false')
        .attr('tabindex', '0')
        .text(d => d[property])
        // .on('input', function (event) {
        //     console.log('input', event);
        // })
        // .on('click', function (event) {
        //     console.log('Click');
        //     event.preventDefault();
        //     d3.select(this).attr('contenteditable', 'true');
        // })
        .on('dblclick', function (event) {
            // console.log('DoubleClick');
            event.preventDefault();
            d3.select(this).attr('contenteditable', 'true');
        })
        .on('keydown', function (event) {
            // console.log(event);
            if (event.key !== 'Enter') return;
            // console.log('Enter', this);
            event.preventDefault();

            const selection = d3.select(this);
            const editable = selection.attr('contenteditable').toLowerCase() === 'true';

            if (editable) {
                selection.attr('contenteditable', 'false');
                this.blur();
            } else {
                selection.attr('contenteditable', 'true');
            }
        })
        // .on('focus', function () {
        //     console.log('focus', this);
        // })
        .on('blur', function () {
            // console.log('blur', this);

            const selection = d3.select(this);
            selection.attr('contenteditable', 'false');

            const datum = selection.datum();
            const text = selection.text();
            datum[property] = text;
            // console.log({ datum, text });
        });
}

const dragHandle = d3.create('div')
    .classed('drag-handle', true)
    .attr('contenteditable', 'false')
    .text('⋮')
    .node();

const swatchPlaceholder = d3.create('div')
    .classed('org-swatch-placeholder', true)
    .node();

function dragger(overview, organizeModal) {

    const drag = {
        /** @type {boolean} */
        active: false,
        /** @type {boolean} */
        clone: false,
        /** @type {d3.Selection<HTMLDivElement, Swatch>} */
        element: null,
        /** @type {Swatch} */
        get swatch() {
            return this.element?.datum()
        },
        reset: function () {
            this.active = false;
            this.clone = false;
            this.element = null;
        }
    };

    const drop = {
        /** @type {boolean} */
        active: false,
        /** @type {Palette} */
        palette: null,
        /** @type {Swatch} */
        swatch: null,
        reset: function () {
            this.active = false;
            this.palette = null;
            this.swatch = null;
        }
    };

    const bucket = d3.create('div')
        .classed('bucket', true);

    overview
        .on('mouseover', function (event) {
            /** @type {HTMLDivElement} */
            const hovered = event.target;
            if (!hovered.matches) debugger;
            // console.log(hovered.className, d3.now());

            if (!drag.active) {
                if (hovered.matches('.org-swatch')) {
                    hovered.append(dragHandle);
                } else if (hovered.matches('.drag-handle')) {
                    // console.log('HANDLing');
                } else {
                    dragHandle.remove();
                }
                return;
            }

            if (hovered.matches('.org-swatch')) {
                if (swatchPlaceholder.parentElement === hovered.parentElement &&
                    hovered.compareDocumentPosition(swatchPlaceholder) === Node.DOCUMENT_POSITION_PRECEDING) {
                    // console.log('drop zone after hovered');

                    drop.reset();
                    drop.active = true;
                    drop.palette = d3.select(hovered.parentElement).datum();

                    /** @type {Swatch} */
                    const swatch = d3.select(hovered).datum();
                    if (swatch === swatch.palette.swatches.at(-1)) {
                        hovered.parentElement.appendChild(swatchPlaceholder);
                    } else {
                        const dropSwatchCandidate = drop.palette.swatches[swatch.getIndex() + 1];

                        drag.swatch === dropSwatchCandidate ?
                            drop.active = false :
                            drop.swatch = dropSwatchCandidate;

                        hovered.parentElement
                            .insertBefore(swatchPlaceholder, hovered.nextElementSibling);
                    }

                    return;
                }

                drop.active = true;
                // console.log('zone', hovered);
                drop.swatch = d3.select(hovered).datum();

                hovered.parentElement
                    .insertBefore(swatchPlaceholder, hovered);

            } else if (hovered.matches('.org-swatch-placeholder')) {
                // console.log('PLACEHOLDing');

            } else if (hovered.matches('.org-palette')) {
                // console.log('PALETTing');
                drop.reset();
                drop.active = true;
                drop.palette = d3.select(hovered).datum();

                hovered.appendChild(swatchPlaceholder);

            } else {
                drop.reset();

                swatchPlaceholder.remove();
            }
        })

    /** @param {d3.D3DragEvent} event */
    function dragstart(event) {
        // console.log('dragStart', event);

        const element = event.sourceEvent.target.parentNode;
        drag.element = d3.select(element);
        drag.active = true;

        const [left, top] = d3.pointer(event, this);
        const parentBBox = overview.node().getBoundingClientRect();
        const childBBox = element.getBoundingClientRect();
        const x = childBBox.x + childBBox.width / 2 - parentBBox.x;
        const y = childBBox.y + childBBox.height / 2 - parentBBox.y;
        const w = childBBox.width;
        const h = childBBox.height;
        // console.log({ element, x, y, w, h });

        this.append(bucket
            .classed('unfocus', false)
            .each(resetCSSAnimation)
            .classed('focus', true)
            .style('--left', left + 'px')
            .style('--top', top + 'px')
            .style('--x', x + 'px')
            .style('--y', y + 'px')
            .style('--w', w + 'px')
            .style('--h', h + 'px')
            .style('background-color', drag.element.style('background-color'))
            .node());

        dragHandle.remove();

        if (event.sourceEvent.altKey) {
            drag.clone = true;
            element.blur();
        } else {
            drag.element.style('display', 'none');
        }

        organizeModal.modal.classed('drag-active', true);
    }

    /** @param {d3.D3DragEvent} event */
    function dragging(event) {
        // console.log(event);
        const [x, y] = d3.pointer(event, this);

        bucket
            .style('--left', x + 'px')
            .style('--top', y + 'px');
    }

    /** @param {d3.D3DragEvent} event */
    function dragend(event) {
        // console.log('dragEnd', event);

        let dragSwatch;

        if (drop.active) {
            if (drag.clone) {
                const { name, color } = drag.swatch;
                dragSwatch = new Swatch(name, color.copy());
            } else {
                dragSwatch = drag.swatch;
                dragSwatch.palette.swatches.splice(dragSwatch.getIndex(), 1);
            }

            if (drop.swatch) {
                dragSwatch.palette = drop.swatch.palette;
                const index = drop.swatch.getIndex();
                drop.swatch.palette.swatches.splice(index, 0, dragSwatch);
            } else if (drop.palette) {
                dragSwatch.palette = drop.palette;
                drop.palette.swatches.push(dragSwatch);
            } else { debugger }

            organizeModal.update();
        } else {
            dragSwatch = drag.swatch;
        }

        const parentBBox = overview.node().getBoundingClientRect();
        const child = drop.active ? swatchPlaceholder :
            (swatchPlaceholder.remove(), drag.element.style('display', null).node())
        const childBBox = child.getBoundingClientRect();
        const x = childBBox.x + childBBox.width / 2 - parentBBox.x;
        const y = childBBox.y + childBBox.height / 2 - parentBBox.y;
        const w = childBBox.width;
        const h = childBBox.height;
        // console.log({ child, x, y, w, h });

        swatchPlaceholder.remove();

        this.append(bucket
            .classed('focus', false)
            .each(resetCSSAnimation)
            .classed('unfocus', true)
            .style('--x', x + 'px')
            .style('--y', y + 'px')
            .style('--w', w + 'px')
            .style('--h', h + 'px')
            .node());

        // focus on swatch preview
        d3.select(organizeModal.swatchMap.get(dragSwatch))
            .style('display', null)
            .each(resetCSSAnimation)
            .node()
            .focus();

        organizeModal.modal.classed('drag-active', false);

        drag.reset();
        drop.reset();
    }

    return d3.drag()
        .filter(function (event) {
            // console.log(event);

            return (
                !event.ctrlKey &&
                !event.button &&
                event.srcElement === dragHandle
            );
        })
        .on('start', dragstart)
        .on('drag', dragging)
        .on('end', dragend)
        (overview);
}

/**
 * Make sure there is no overlap in CSS animations
 * @param {*} d 
 * @param {number|0} i 
 * @param {d3.BaseType[]} g 
 * @example d3.select('*').each(resetCSSAnimation);
 */
function resetCSSAnimation(d, i, g) {
    const element = g[i];
    element.style.animation = 'none';
    element.offsetHeight; /* trigger reflow */
    element.style.animation = null;
}
